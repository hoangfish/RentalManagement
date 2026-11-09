// Firestore: rooms/{roomId}
//   ownerId, ownerName, title, address, location {lat,lng,approximate}|null, area, price, maxPeople,
//   description, amenities[], photos[{id,file}], status, views3d, createdAt, updatedAt
const { getDb } = require('../config/db');
const { COLLECTIONS } = require('../common/constant');
const { photoUrl } = require('../config/storage');

const col = () => getDb().collection(COLLECTIONS.ROOMS);
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v instanceof Date ? v : null);
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
            photos: (room.photos || []).map((p) => ({ id: p.id, url: photoUrl(room.id, p.file) })),
            status: room.status,
            views3d: room.views3d || 0,
            createdAt: toDate(room.createdAt)?.toISOString() ?? null,
            updatedAt: toDate(room.updatedAt)?.toISOString() ?? null,
        };
    }
}

module.exports = { RoomModel };
