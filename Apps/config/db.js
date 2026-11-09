// Firebase / Firestore connection (replaces the old MongoDB connection).
const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db = null;

function buildCredential() {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (keyPath) {
        const abs = path.resolve(keyPath);
        if (!fs.existsSync(abs)) {
            throw new Error(`Firebase service account file not found: ${abs}`);
        }
        return cert(JSON.parse(fs.readFileSync(abs, 'utf8')));
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    }
    return applicationDefault();
}

const DBConnection = async () => {
    if (db) return db;
    initializeApp({ credential: buildCredential() });
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });

    // Fail fast with a readable message if the key is wrong or Firestore is not enabled yet.
    await db.collection('_health').limit(1).get();
    console.log('Firebase Firestore connected'.cyan.underline.bold);
    return db;
};

const getDb = () => {
    if (!db) throw new Error('Database is not connected yet');
    return db;
};

module.exports = DBConnection;
module.exports.getDb = getDb;
