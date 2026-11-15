// Firestore: rooms/{roomId}
//   ownerId, ownerName, title, address, location {lat,lng,approximate}|null, area, price, maxPeople,
//   description, amenities[], nearby[] ('school'|'market'|'bus', from OpenStreetMap), photos[{id,file}], panoramas[{id,file,label}] (360° photos), status, views3d, createdAt, updatedAt
const { getDb } = require('../config/db');
const { COLLECTIONS, ROOM_STATUS } = require('../common/constant');
const { photoUrl } = require('../config/storage');

const col = () => getDb().collection(COLLECTIONS.ROOMS);
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v instanceof Date ? v : null);
const photosOf = (room) => (room.photos || []).map((p) => ({ id: p.id, url: photoUrl(room.id, p.file) }));
const panoramasOf = (room) => (room.panoramas || []).map((p) => ({ id: p.id, label: p.label || '', url: photoUrl(room.id, p.file) }));
const fromDoc = (doc) => (doc.exists ? { id: doc.id, ...doc.data() } : null);

class RoomModel {
    static newId() { return col().doc().id; }

    static async create(room) {
        const now = new Date();
        const { id, ...rest } = room;
        const data = { ...rest, views3d: 0, createdAt: now, updatedAt: now };
        await col().doc(id).set(data);
        return { id, ...data };
    }

    static async findById(id) {
        return fromDoc(await col().doc(String(id)).get());
    }

    static async update(id, patch) {
        await col().doc(id).update({ ...patch, updatedAt: new Date() });
        return RoomModel.findById(id);
    }

    static async listByOwner(ownerId) {
        const snap = await col().where('ownerId', '==', ownerId).get();
        return snap.docs.map(fromDoc);
    }

    static async listActive() {
        const snap = await col().where('status', '==', ROOM_STATUS.ACTIVE).limit(1000).get();
        return snap.docs.map(fromDoc);
    }

    // Does not touch updatedAt: this is background data, not an edit by the landlord.
    static async setNearby(id, nearby) {
        await col().doc(id).update({ nearby });
    }

    // Background data too (see RoomController.backfillLocations): do not touch updatedAt.
    static async setLocation(id, location) {
        await col().doc(id).update({ location, locationTriedAt: new Date() });
    }

    static async incrementViews(id) {
        const ref = col().doc(id);
        await getDb().runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (doc.exists) tx.update(ref, { views3d: (doc.data().views3d || 0) + 1 });
        });
    }

    // What any signed-in tenant may see: no owner id and no contact details.
    static toPublic(room) {
        return {
            id: room.id,
            title: room.title,
            ownerName: room.ownerName,
            address: room.address,
            location: room.location || null,
            area: room.area,
            price: room.price,
            maxPeople: room.maxPeople,
            description: room.description || '',
            amenities: room.amenities || [],
            nearby: room.nearby || [],
            photos: photosOf(room),
            panoramas: panoramasOf(room),
            updatedAt: toDate(room.updatedAt)?.toISOString() ?? null,
        };
    }

    // What the landlord sees on their dashboard / edit form
    static toOwner(room) {
        return {
            id: room.id,
            title: room.title,
            ownerName: room.ownerName,
            address: room.address,
            location: room.location || null,
            area: room.area,
            price: room.price,
            maxPeople: room.maxPeople,
            description: room.description || '',
            amenities: room.amenities || [],
            nearby: room.nearby || [],
            photos: photosOf(room),
            panoramas: panoramasOf(room),
            status: room.status,
            views3d: room.views3d || 0,
            createdAt: toDate(room.createdAt)?.toISOString() ?? null,
            updatedAt: toDate(room.updatedAt)?.toISOString() ?? null,
        };
    }
}

module.exports = { RoomModel };
