const fs = require('fs');
const path = require('path');
const { AppError } = require('./errors');
const {
    MAX_PHOTO_BYTES, PANORAMA_MIN_WIDTH, PANORAMA_MAX_WIDTH, PANORAMA_RATIO_TOLERANCE,
} = require('./constant');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Never trust the browser's mimetype: check the real file signature.
// Returns 'jpeg' | 'png' | 'webp' | null
function sniffType(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
}

// Reads { width, height } from the file header without decoding the picture (no image library needed).
// Returns null when the header cannot be understood.
async function readImageSize(filePath) {
    const handle = await fs.promises.open(filePath, 'r');
    try {
        const { size: fileSize } = await handle.stat();
        const read = async (length, position) => {
            if (position + length > fileSize) return null;
            const buf = Buffer.alloc(length);
            const { bytesRead } = await handle.read(buf, 0, length, position);
            return bytesRead === length ? buf : null;
        };

        const head = await read(12, 0);
        if (!head) return null;
        const type = sniffType(head);

        if (type === 'png') {
            const ihdr = await read(8, 16);
            return ihdr ? { width: ihdr.readUInt32BE(0), height: ihdr.readUInt32BE(4) } : null;
        }

        if (type === 'webp') {
            const chunk = await read(16, 12); // fourcc(4) size(4) + first 8 bytes of the chunk
            if (!chunk) return null;
            const fourcc = chunk.toString('ascii', 0, 4);
            if (fourcc === 'VP8X') {
                const dims = await read(6, 24);
                return dims ? { width: 1 + dims.readUIntLE(0, 3), height: 1 + dims.readUIntLE(3, 3) } : null;
            }
            if (fourcc === 'VP8L') {
                const bits = await read(4, 21); // after the 0x2f signature byte
                if (!bits) return null;
                const v = bits.readUInt32LE(0);
                return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 };
            }
            if (fourcc === 'VP8 ') {
                const frame = await read(10, 20); // frame tag(3) start code(3) width(2) height(2)
                if (!frame || frame[3] !== 0x9d || frame[4] !== 0x01 || frame[5] !== 0x2a) return null;
                return { width: frame.readUInt16LE(6) & 0x3fff, height: frame.readUInt16LE(8) & 0x3fff };
            }
            return null;
        }

        if (type === 'jpeg') {
            // Walk the marker segments until a "start of frame" one (it holds the size).
            let pos = 2;
            while (pos + 4 <= fileSize) {
                const seg = await read(4, pos);
                if (!seg || seg[0] !== 0xff) return null;
                const marker = seg[1];
                if (marker === 0xff) { pos += 1; continue; }                       // padding
                if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { pos += 2; continue; } // no length
                const length = seg.readUInt16BE(2);
                const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
                if (isFrame) {
                    // marker(2) length(2) precision(1) height(2) width(2)
                    const frame = await read(4, pos + 5);
                    return frame ? { height: frame.readUInt16BE(0), width: frame.readUInt16BE(2) } : null;
                }
                if (marker === 0xda) return null; // image data began without a frame header
                pos += 2 + length;
            }
        }
        return null;
    } finally {
        await handle.close();
    }
}

async function looksLikeImage(file) {
    const handle = await fs.promises.open(file.path, 'r');
    try {
        const buf = Buffer.alloc(12);
        await handle.read(buf, 0, 12, 0);
        return sniffType(buf) !== null;
    } finally {
        await handle.close();
    }
}

// Normal room photos: real image files, each under MAX_PHOTO_BYTES.
async function verifyImages(files) {
    for (const f of files) {
        if (!(await looksLikeImage(f))) {
            throw new AppError(400, 'One of the uploaded files is not a valid JPG, PNG or WebP image', {
                photos: 'One of the uploaded files is not a valid JPG, PNG or WebP image',
            });
        }
        if (f.size > MAX_PHOTO_BYTES) {
            throw new AppError(400, 'Each photo must be under 10 MB', { photos: 'Each photo must be under 10 MB' });
        }
    }
}

// 360° photos: real image files AND the right shape (2:1) and size, otherwise the viewer would show a stretched room.
async function verifyPanoramas(files) {
    for (const f of files) {
        const fail = (message) => new AppError(400, message, { panoramas: message });
        if (!(await looksLikeImage(f))) throw fail('The 360° photo is not a valid JPG, PNG or WebP image');
        const size = await readImageSize(f.path);
        if (!size || !size.width || !size.height) throw fail('We could not read the size of the 360° photo');

        const { width, height } = size;
        if (Math.abs(width / height - 2) > 2 * PANORAMA_RATIO_TOLERANCE) {
            throw fail(`A 360° photo must be twice as wide as it is tall (2:1). This one is ${width}×${height}`);
        }
        if (width < PANORAMA_MIN_WIDTH) {
            throw fail(`The 360° photo is too small (${width}×${height}). Use at least ${PANORAMA_MIN_WIDTH}×${PANORAMA_MIN_WIDTH / 2} px`);
        }
        if (width > PANORAMA_MAX_WIDTH) {
            throw fail(`The 360° photo is too large (${width}×${height}). Use at most ${PANORAMA_MAX_WIDTH}×${PANORAMA_MAX_WIDTH / 2} px`);
        }
    }
}

async function removeFiles(paths) {
    await Promise.all(paths.map((p) => fs.promises.unlink(p).catch(() => {})));
    // drop the room folder if it ended up empty
    const dirs = new Set(paths.map((p) => path.dirname(p)));
    await Promise.all([...dirs].map((d) => fs.promises.rmdir(d).catch(() => {})));
}

module.exports = { readImageSize, verifyImages, verifyPanoramas, removeFiles };
