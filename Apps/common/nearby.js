// "What is around this room?" using OpenStreetMap's Overpass API (free, no key).
// Returns which of 'school' | 'market' | 'bus' exist within WALK_M metres of a point.
// Be polite: one request at a time, at least MIN_GAP_MS apart. Results are stored on the room,
// so each room is looked up once (not on every search).
const { reason } = require('./netError');

const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];
const WALK_M = 700; // ~10 minutes on foot
const MIN_GAP_MS = 1100;

let chain = Promise.resolve();
let lastCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function enqueue(task) {
    const run = chain.then(async () => {
        const wait = lastCall + MIN_GAP_MS - Date.now();
        if (wait > 0) await sleep(wait);
        try { return await task(); } finally { lastCall = Date.now(); }
    });
    chain = run.catch(() => {});
    return run;
}

const buildQuery = (lat, lng) => `[out:json][timeout:12];
(
  nwr(around:${WALK_M},${lat},${lng})[amenity~"^(school|kindergarten|college|university)$"];
  nwr(around:${WALK_M},${lat},${lng})[amenity=marketplace];
  nwr(around:${WALK_M},${lat},${lng})[shop~"^(supermarket|mall)$"];
  nwr(around:${WALK_M},${lat},${lng})[highway=bus_stop];
  nwr(around:${WALK_M},${lat},${lng})[amenity=bus_station];
);
out tags;`;

function classify(elements) {
    const found = new Set();
    for (const { tags = {} } of elements) {
        if (['school', 'kindergarten', 'college', 'university'].includes(tags.amenity)) found.add('school');
        if (tags.amenity === 'marketplace' || ['supermarket', 'mall'].includes(tags.shop)) found.add('market');
        if (tags.highway === 'bus_stop' || tags.amenity === 'bus_station') found.add('bus');
    }
    return ['school', 'market', 'bus'].filter((k) => found.has(k));
}

async function ask(endpoint, lat, lng) {
    const contact = process.env.NOMINATIM_CONTACT || 'dev';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: '*/*',
            'User-Agent': `RoommateFinder/1.0 (${contact})`,
        },
        body: new URLSearchParams({ data: buildQuery(lat, lng) }),
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
    const json = await res.json();
    return classify(json.elements || []);
}

// Throws if every server fails (callers treat that as "unknown", not as "nothing nearby").
async function fetchNearby({ lat, lng }) {
    return enqueue(async () => {
        const failures = [];
        for (const endpoint of ENDPOINTS) {
            try { return await ask(endpoint, lat, lng); } catch (err) { failures.push(`${new URL(endpoint).host}: ${reason(err)}`); }
        }
        throw new Error(failures.join('; '));
    });
}

module.exports = { fetchNearby, classify };
