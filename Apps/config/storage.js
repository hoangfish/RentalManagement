// Room photos are stored on this server's disk:  uploads/rooms/<roomId>/<random>.jpg
// (free, and the future 3D-reconstruction service can read the files directly).
// For production on several servers, move this to Cloud Storage / S3.
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');
const { AppError } = require('../common/errors');
const { MAX_PHOTOS, MAX_PANORAMAS, MAX_PANORAMA_BYTES } = require('../common/constant');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

const roomDir = (roomId) => path.join(UPLOAD_DIR, 'rooms', roomId);
const photoUrl = (roomId, file) => `/uploads/rooms/${roomId}/${file}`;
// Panoramas live in the same folder, with a "pano-" prefix so they are easy to tell apart on disk.
const PANO_PREFIX = 'pano-';

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const id = req.roomId || req.params.id;
        if (!SAFE_ID.test(String(id))) return cb(new AppError(400, 'Invalid room id'));
        const dir = roomDir(id);
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    // The extension comes from the validated mimetype, never from the client's file name.
    filename: (req, file, cb) =>
        cb(null, `${file.fieldname === 'panoramas' ? PANO_PREFIX : ''}${randomUUID()}${EXT[file.mimetype]}`),
});

const upload = multer({
    storage,
    // fileSize is the larger (360°) limit; normal photos are checked against their own limit in verifyImages().
    limits: { files: MAX_PHOTOS + MAX_PANORAMAS, fileSize: MAX_PANORAMA_BYTES, fields: 30, fieldSize: 20 * 1024 },
    fileFilter: (req, file, cb) =>
        EXT[file.mimetype] ? cb(null, true) : cb(new AppError(400, 'Only JPG, PNG or WebP photos are allowed')),
});

module.exports = {
    UPLOAD_DIR, SAFE_ID, roomDir, photoUrl,
    uploadRoomFiles: upload.fields([
        { name: 'photos', maxCount: MAX_PHOTOS },
        { name: 'panoramas', maxCount: MAX_PANORAMAS },
    ]),
};
