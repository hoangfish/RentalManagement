// Address -> { lat, lng, label, approximate } using OpenStreetMap Nominatim (free, no key).
// Usage policy: max 1 request/second, identify your app, cache results.
//   https://operations.osmfoundation.org/policies/nominatim/
const BASE = 'https://nominatim.openstreetmap.org/search';
const MIN_GAP_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

const cache = new Map();
let chain = Promise.resolve();
let lastCall = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One request at a time, at least MIN_GAP_MS apart.
function enqueue(task) {
    const run = chain.then(async () => {
        const wait = lastCall + MIN_GAP_MS - Date.now();
        if (wait > 0) await sleep(wait);
        try { return await task(); } finally { lastCall = Date.now(); }
    });
    chain = run.catch(() => {});
    return run;
}

async function queryNominatim(q) {
    const url = new URL(BASE);
    url.search = new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'vn', 'accept-language': 'en' });
    const contact = process.env.NOMINATIM_CONTACT || 'dev';
    const res = await fetch(url, {
        headers: { 'User-Agent': `RoommateFinder/1.0 (${contact})`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
    const [hit] = await res.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
}

// Vietnamese house numbers are often missing from OSM, so if the full address is not found
// we retry without the first part(s): "12/3 Le Loi, Ben Nghe, District 1" -> "Ben Nghe, District 1".
// `approximate: true` means the point is the street/ward, not the exact house.
async function geocode(address) {
    const key = String(address).trim().toLowerCase();
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;

    const parts = String(address).split(',').map((s) => s.trim()).filter(Boolean);
    let found = null;
    for (let i = 0; i < Math.min(parts.length, 4); i++) {
        const q = parts.slice(i).join(', ');
        if (q.length < 3) break;
        const r = await enqueue(() => queryNominatim(q));
        if (r) { found = { ...r, approximate: i > 0 }; break; }
    }

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { value: found, expires: Date.now() + CACHE_TTL_MS });
    return found;
}

module.exports = { geocode };
