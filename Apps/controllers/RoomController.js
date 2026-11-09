// Landlord side of the rooms API. (Tenant search / contact / 3D view come later.)
const { randomUUID } = require('crypto');
const path = require('path');
const asyncHandler = require('../middlewares/async');
const { AppError } = require('../common/errors');
const { RoomModel } = require('../models/RoomModel');
const { ROOM_STATUS, MIN_PHOTOS, MAX_PHOTOS } = require('../common/constant');
const { validateRoomInput, parseOrder } = require('../common/roomValidators');
const { verifyImages, removeFiles } = require('../common/images');
const { geocode } = require('../common/geocode');
const { roomDir } = require('../config/storage');

const invalid = (errors) => new AppError(400, Object.values(errors)[0], errors);

const NO_PIN_WARNING =
    'We could not find this address on the map, so the room will not show up in nearby searches yet. ' +
    'Try adding the ward, district and city to the address.';

// Turns the address into map coordinates (for "rooms near me"). Never blocks posting:
// if the lookup fails the room is still saved, just without a location, and we warn the landlord.
async function locate(address) {
    try {
        const found = await geocode(address);
        if (found) return { location: { lat: found.lat, lng: found.lng, approximate: Boolean(found.approximate) }, warning: null };
        return { location: null, warning: NO_PIN_WARNING };
    } catch (err) {
        console.error('Geocoding failed:', err.message);
        return { location: null, warning: NO_PIN_WARNING };
    }
}

// photoOrder is the final order chosen by the landlord: existing photo ids and "new" placeholders
// (the n-th "new" is the n-th uploaded file). Existing ids left out get deleted.
function buildPhotos(order, existing, files) {
    const byId = new Map(existing.map((p) => [p.id, p]));
    const uploaded = files.map((f) => ({ id: randomUUID().slice(0, 12), file: f.filename }));
    const bad = () => invalid({ photos: 'Photo order is invalid' });

    if (order === undefined) throw bad();
    if (order === null) return { photos: [...existing, ...uploaded], removed: [] };

    const seen = new Set();
    let next = 0;
    const photos = [];
    for (const token of order) {
        if (token === 'new') {
            if (next >= uploaded.length) throw bad();
            photos.push(uploaded[next++]);
        } else if (byId.has(token) && !seen.has(token)) {
            seen.add(token);
            photos.push(byId.get(token));
        } else {
            throw bad();
        }
    }
    if (next !== uploaded.length) throw bad();
    return { photos, removed: existing.filter((p) => !seen.has(p.id)) };
}

function checkPhotoCount(count, mustHaveMin) {
    if (count > MAX_PHOTOS) throw invalid({ photos: `You can upload at most ${MAX_PHOTOS} photos` });
    if (mustHaveMin && count < MIN_PHOTOS) {
        throw invalid({ photos: `Add at least ${MIN_PHOTOS} photos so a 3D model can be built (you have ${count})` });
    }
}

const createRoom = asyncHandler(async (req, res) => {
    const files = req.files || [];
    let saved = false;
    try {
        const publish = req.body.intent === 'publish';
        const { errors, value } = validateRoomInput(req.body, { requireAll: publish });
        if (Object.keys(errors).length) throw invalid(errors);

        await verifyImages(files);
        const { photos } = buildPhotos(parseOrder(req.body.photoOrder), [], files);
        checkPhotoCount(photos.length, publish);

        const { location, warning } = value.address ? await locate(value.address) : { location: null, warning: null };
        const room = await RoomModel.create({
            id: req.roomId,
            ownerId: req.user.id,
            ...value,
            ownerName: value.ownerName || `${req.user.firstName} ${req.user.lastName}`,
            location,
            photos,
            status: publish ? ROOM_STATUS.ACTIVE : ROOM_STATUS.DRAFT,
        });
        saved = true;
        res.status(201).json({
            success: true,
            message: publish ? 'Room posted' : 'Draft saved',
            warning: publish ? warning : null,
            data: { room: RoomModel.toOwner(room) },
        });
    } finally {
        if (!saved) await removeFiles(files.map((f) => f.path));
    }
});

const updateRoom = asyncHandler(async (req, res) => {
    const files = req.files || [];
    const room = req.room;
    let saved = false;
    try {
        const intent = ['draft', 'publish', 'save'].includes(req.body.intent) ? req.body.intent : 'save';
        if (intent === 'draft' && room.status !== ROOM_STATUS.DRAFT) {
            throw new AppError(400, 'Only drafts can be saved as drafts');
        }
        const status = intent === 'publish' ? ROOM_STATUS.ACTIVE : room.status;
        const requireAll = status !== ROOM_STATUS.DRAFT;

        const { errors, value } = validateRoomInput(req.body, { requireAll });
        if (Object.keys(errors).length) throw invalid(errors);

        await verifyImages(files);
        const { photos, removed } = buildPhotos(parseOrder(req.body.photoOrder), room.photos || [], files);
        checkPhotoCount(photos.length, requireAll);

        let location = room.location || null;
        let warning = null;
        if (!value.address) {
            location = null;
        } else if (value.address !== room.address || !location) {
            ({ location, warning } = await locate(value.address));
        }

        const updated = await RoomModel.update(room.id, {
            ...value,
            ownerName: value.ownerName || room.ownerName,
            location,
            photos,
            status,
        });
        saved = true;
        await removeFiles(removed.map((p) => path.join(roomDir(room.id), p.file)));
        res.json({
            success: true,
            message: status === ROOM_STATUS.DRAFT ? 'Draft saved' : intent === 'publish' ? 'Room posted' : 'Changes saved',
            warning: status === ROOM_STATUS.DRAFT ? null : warning,
            data: { room: RoomModel.toOwner(updated) },
        });
    } finally {
        if (!saved) await removeFiles(files.map((f) => f.path));
    }
});

const setRoomStatus = asyncHandler(async (req, res) => {
    const room = req.room;
    const status = req.body?.status;
    if (![ROOM_STATUS.ACTIVE, ROOM_STATUS.HIDDEN, ROOM_STATUS.RENTED].includes(status)) {
        throw new AppError(400, 'Invalid status');
    }
    if (room.status === ROOM_STATUS.DRAFT) {
        throw new AppError(400, 'Open the draft and press "Post room" to publish it');
    }
    const updated = await RoomModel.update(room.id, { status });
    res.json({ success: true, data: { room: RoomModel.toOwner(updated) } });
});

const getMyRooms = asyncHandler(async (req, res) => {
    const time = (r) => (r.updatedAt?.toDate ? r.updatedAt.toDate() : r.updatedAt)?.getTime?.() ?? 0;
    const rooms = (await RoomModel.listByOwner(req.user.id)).sort((a, b) => time(b) - time(a));
    res.json({
        success: true,
        data: {
            rooms: rooms.map(RoomModel.toOwner),
            stats: {
                active: rooms.filter((r) => r.status === ROOM_STATUS.ACTIVE).length,
                views3d: rooms.reduce((sum, r) => sum + (r.views3d || 0), 0),
            },
        },
    });
});

// The landlord's own room (for the edit form). req.room was loaded by loadOwnedRoom.
const getMyRoom = asyncHandler(async (req, res) => {
    res.json({ success: true, data: { room: RoomModel.toOwner(req.room) } });
});

module.exports = { createRoom, updateRoom, setRoomStatus, getMyRooms, getMyRoom };
