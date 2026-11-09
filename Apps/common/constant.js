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

const MIN_PHOTOS = 6;          // minimum needed to build a 3D model
const MAX_PHOTOS = 20;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72; // bcrypt ignores everything after 72 bytes
const BCRYPT_ROUNDS = 10;

module.exports = {
    ROLES, COLLECTIONS, ROOM_STATUS, AMENITIES,
    MIN_PHOTOS, MAX_PHOTOS, MAX_PHOTO_BYTES,
    PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES, BCRYPT_ROUNDS,
};
