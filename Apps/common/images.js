const fs = require('fs');
const path = require('path');
const { AppError } = require('./errors');

// Never trust the browser's mimetype: check the real file signature.
async function looksLikeImage(file) {
    const handle = await fs.promises.open(file.path, 'r');
    try {
        const buf = Buffer.alloc(12);
        await handle.read(buf, 0, 12, 0);
        const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const webp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
        return jpeg || png || webp;
    } finally {
        await handle.close();
    }
}

async function verifyImages(files) {
    for (const f of files) {
        if (!(await looksLikeImage(f))) {
            throw new AppError(400, 'One of the uploaded files is not a valid JPG, PNG or WebP image', {
                photos: 'One of the uploaded files is not a valid JPG, PNG or WebP image',
            });
        }
    }
}

async function removeFiles(paths) {
    await Promise.all(paths.map((p) => fs.promises.unlink(p).catch(() => {})));
    // drop the room folder if it ended up empty
    const dirs = new Set(paths.map((p) => path.dirname(p)));
    await Promise.all([...dirs].map((d) => fs.promises.rmdir(d).catch(() => {})));
}

module.exports = { verifyImages, removeFiles };
