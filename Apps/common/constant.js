// Shared constants for the HTTP server (counterpart of Pkg/Common/constant.js on the client).

const ROLES = Object.freeze({
    TENANT: 'tenant',     // "Rent a room"
    LANDLORD: 'landlord', // "Rent out a room"
});

const COLLECTIONS = Object.freeze({
    USERS: 'users',
    USER_INDEX: 'userIndex', // unique-key documents (email / phone -> userId)
    ROOMS: 'rooms',
});

const ROOM_STATUS = Object.freeze({
    DRAFT: 'draft',     // saved, not visible to tenants
    ACTIVE: 'active',   // visible in search ("Visible")
    HIDDEN: 'hidden',   // landlord switched it off
    RENTED: 'rented',   // already rented out
});

// Keep in sync with CLIENT/Pkg/Common/constant.js
const AMENITIES = ['Air conditioner', 'Mezzanine', 'Washing machine', 'Parking', 'Kitchen', 'Balcony', 'Furnished'];

// "Near ..." filters on the tenant search page (computed from OpenStreetMap, see common/nearby.js)
const NEARBY = ['school', 'market', 'bus'];

const MIN_PHOTOS = 1;          // a posted room needs at least one normal photo (the cover)
const MAX_PHOTOS = 20;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// 360° photos (equirectangular, 2:1). The viewer wraps one around the tenant like the inside of a sphere.
// MAX_PANORAMAS is 1 for now; later the same code will allow several (one per spot) linked together.
const MAX_PANORAMAS = 1;
const MAX_PANORAMA_BYTES = 25 * 1024 * 1024;
const PANORAMA_MIN_WIDTH = 2048;
const PANORAMA_MAX_WIDTH = 8192;
const PANORAMA_RATIO_TOLERANCE = 0.03; // width / height may be 2 ± 3 %
const PANORAMA_LABEL_MAX = 40;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72; // bcrypt ignores everything after 72 bytes
const BCRYPT_ROUNDS = 10;

module.exports = {
    ROLES, COLLECTIONS, ROOM_STATUS, AMENITIES, NEARBY,
    MIN_PHOTOS, MAX_PHOTOS, MAX_PHOTO_BYTES,
    MAX_PANORAMAS, MAX_PANORAMA_BYTES, PANORAMA_MIN_WIDTH, PANORAMA_MAX_WIDTH, PANORAMA_RATIO_TOLERANCE, PANORAMA_LABEL_MAX,
    PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES, BCRYPT_ROUNDS,
};
