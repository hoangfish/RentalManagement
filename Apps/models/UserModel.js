// Firestore layout
//   users/{userId}                 -> profile + password hash
//   userIndex/email_<encoded>      -> { userId }   (guarantees unique emails)
//   userIndex/phone_<number>       -> { userId }   (guarantees unique phone numbers)
// The index documents are written in the same transaction as the user, so two people
// can never register the same email/phone at the same time.
const { getDb } = require('../config/db');
const { COLLECTIONS } = require('../common/constant');
const { AppError } = require('../common/errors');

const emailKey = (email) => `email_${encodeURIComponent(email)}`;
const phoneKey = (phone) => `phone_${phone}`;

const fromDoc = (doc) => (doc.exists ? { id: doc.id, ...doc.data() } : null);

class UserModel {
    static async create({ firstName, lastName, email, phone, passwordHash, role }) {
        const db = getDb();
        const userRef = db.collection(COLLECTIONS.USERS).doc();
        const emailRef = db.collection(COLLECTIONS.USER_INDEX).doc(emailKey(email));
        const phoneRef = db.collection(COLLECTIONS.USER_INDEX).doc(phoneKey(phone));
        const data = { firstName, lastName, email, phone, passwordHash, role, createdAt: new Date() };

        await db.runTransaction(async (tx) => {
            const [emailDoc, phoneDoc] = await Promise.all([tx.get(emailRef), tx.get(phoneRef)]);
            if (emailDoc.exists) throw new AppError(409, 'Email is already in use');
            if (phoneDoc.exists) throw new AppError(409, 'Phone number is already in use');
            tx.set(userRef, data);
            tx.set(emailRef, { userId: userRef.id });
            tx.set(phoneRef, { userId: userRef.id });
        });

        return { id: userRef.id, ...data };
    }

    static async findById(id) {
        if (!id) return null;
        const doc = await getDb().collection(COLLECTIONS.USERS).doc(String(id)).get();
        return fromDoc(doc);
    }

    // identifier is an already-normalized email or phone number
    static async findByIdentifier(identifier, isEmail) {
        const key = isEmail ? emailKey(identifier) : phoneKey(identifier);
        const index = await getDb().collection(COLLECTIONS.USER_INDEX).doc(key).get();
        if (!index.exists) return null;
        return UserModel.findById(index.data().userId);
    }

    // Safe to send to the client (never includes the password hash)
    static toPublic(user) {
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
        };
    }
}

module.exports = { UserModel };
