// Rooms API: landlord side (post / edit / status) and tenant side (search / contact / 3D view count).
const { randomUUID } = require('crypto');
const path = require('path');
const asyncHandler = require('../middlewares/async');
const { AppError } = require('../common/errors');
const { RoomModel } = require('../models/RoomModel');
const { ROOM_STATUS, MIN_PHOTOS, MAX_PHOTOS, NEARBY } = require('../common/constant');
const { validateRoomInput, parseOrder } = require('../common/roomValidators');
const { verifyImages, removeFiles } = require('../common/images');
const { geocode } = require('../common/geocode');
const { roomDir, SAFE_ID } = require('../config/storage');
const { UserModel } = require('../models/UserModel');
const { distanceKm } = require('../common/geo');
const { fetchNearby } = require('../common/nearby');
const { toInt, toNumber } = require('../common/roomValidators');

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

// Looks up schools / markets / bus stops around the room (OpenStreetMap) and stores them on the room.
// Runs in the background after saving so the landlord never waits for it; failures are only logged.
function refreshNearby(roomId, location) {
    if (!location) return;
    fetchNearby(location)
        .then((nearby) => RoomModel.setNearby(roomId, nearby))
        .catch((err) => console.error('Nearby lookup failed:', err.message));
}

// Rooms posted while the map service was unreachable have no location yet. Whenever somebody
// searches, quietly give a few of them one (and look up what is around them). Runs in the background,
// never makes a search wait, and backs off when the service is still down.
const RETRY_AFTER_MS = 10 * 60 * 1000;
const millis = (v) => (v?.toDate ? v.toDate().getTime() : v instanceof Date ? v.getTime() : 0);
let backfilling = false;
let backfillPausedUntil = 0;
async function backfillLocations() {
    if (backfilling || Date.now() < backfillPausedUntil) return;
    backfilling = true;
    try {
        const now = Date.now();
        const todo = (await RoomModel.listActive())
            .filter((r) => !r.location && r.address && now - millis(r.locationTriedAt) > RETRY_AFTER_MS)
            .slice(0, 5);
        for (const room of todo) {
            let found;
            try {
                found = await geocode(room.address);
            } catch (err) {
                console.error('Location backfill failed:', err.message);
                backfillPausedUntil = Date.now() + 2 * 60 * 1000;
                return;
            }
            const location = found ? { lat: found.lat, lng: found.lng, approximate: Boolean(found.approximate) } : null;
            await RoomModel.setLocation(room.id, location);
            refreshNearby(room.id, location);
        }
    } catch (err) {
        console.error('Location backfill error:', err.message);
    } finally {
        backfilling = false;
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
        if (publish) refreshNearby(room.id, location);
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
        if (status !== ROOM_STATUS.DRAFT && location && (location !== room.location || room.nearby === undefined)) {
            refreshNearby(room.id, location);
        }
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

// ---------- tenant ----------

// Search rooms around an address. Query: address, radiusKm, minPrice, maxPrice, minArea, nearby (comma list)
const searchRooms = asyncHandler(async (req, res) => {
    backfillLocations();
    const q = req.query;
    const address = String(q.address ?? '').trim().slice(0, 200);
    const radiusKm = Math.min(50, Math.max(0.1, toNumber(q.radiusKm) || 3));
    const minPrice = toInt(q.minPrice);
    const maxPrice = toInt(q.maxPrice);
    const minArea = toNumber(q.minArea);
    const wanted = [...new Set(String(q.nearby ?? '').split(',').map((s) => s.trim()).filter((s) => NEARBY.includes(s)))];

    let center = null;
    if (address) {
        let found;
        try {
            found = await geocode(address);
        } catch (err) {
            console.error('Geocoding failed:', err.message);
            throw new AppError(503, 'Address lookup is temporarily unavailable. Please try again in a moment');
        }
        if (!found) {
            throw new AppError(422, 'We could not find that address. Try adding the ward, district or city', {
                address: 'We could not find that address. Try adding the ward, district or city',
            });
        }
        center = { lat: found.lat, lng: found.lng, label: found.label, approximate: Boolean(found.approximate) };
    }

    let rooms = (await RoomModel.listActive()).filter((r) =>
        (Number.isNaN(minPrice) || r.price >= minPrice) &&
        (Number.isNaN(maxPrice) || r.price <= maxPrice) &&
        (Number.isNaN(minArea) || r.area >= minArea));

    let results = rooms.map((r) => ({
        room: r,
        distanceKm: center && r.location ? distanceKm(center, r.location) : null,
    }));
    if (center) {
        results = results.filter((x) => x.distanceKm !== null && x.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
        const time = (r) => (r.updatedAt?.toDate ? r.updatedAt.toDate() : r.updatedAt)?.getTime?.() ?? 0;
        results.sort((a, b) => time(b.room) - time(a.room));
    }

    // Rooms posted before their surroundings were looked up: do it now (a few at a time).
    if (wanted.length) {
        let budget = 6;
        for (const x of results) {
            if (x.room.nearby !== undefined || !x.room.location || budget <= 0) continue;
            budget--;
            try {
                x.room.nearby = await fetchNearby(x.room.location);
                await RoomModel.setNearby(x.room.id, x.room.nearby);
            } catch (err) {
                console.error('Nearby lookup failed:', err.message);
            }
        }
        results = results.filter((x) => wanted.every((w) => (x.room.nearby || []).includes(w)));
    }

    res.json({
        success: true,
        data: {
            center,
            radiusKm,
            total: results.length,
            results: results.slice(0, 100).map((x) => ({
                ...RoomModel.toPublic(x.room),
                distanceKm: x.distanceKm === null ? null : Math.round(x.distanceKm * 100) / 100,
            })),
        },
    });
});

const findVisibleRoom = async (id) => {
    const room = SAFE_ID.test(String(id)) ? await RoomModel.findById(id) : null;
    if (!room || room.status !== ROOM_STATUS.ACTIVE) throw new AppError(404, 'Room not found');
    return room;
};

// Counts a tenant opening the "View 3D" preview (shown on the landlord's dashboard).
const recordView3d = asyncHandler(async (req, res) => {
    const room = await findVisibleRoom(req.params.id);
    await RoomModel.incrementViews(room.id);
    res.json({ success: true });
});

// Contact details are only revealed on request, to signed-in tenants, for visible rooms.
const getContact = asyncHandler(async (req, res) => {
    const room = await findVisibleRoom(req.params.id);
    const owner = await UserModel.findById(room.ownerId);
    if (!owner) throw new AppError(404, 'Owner not found');
    res.json({ success: true, data: { ownerName: room.ownerName, phone: owner.phone, email: owner.email } });
});

module.exports = { createRoom, updateRoom, setRoomStatus, getMyRooms, getMyRoom, searchRooms, recordView3d, getContact };
