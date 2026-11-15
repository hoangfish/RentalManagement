// Address -> { lat, lng, label, approximate }. Free services, no API key:
//   1. Nominatim (OpenStreetMap)      https://operations.osmfoundation.org/policies/nominatim/
//   2. Photon (komoot, OSM data)      used only when Nominatim cannot be reached
// Be polite: one request at a time, at least MIN_GAP_MS apart, results cached for a day.
//
// Results are biased towards Ho Chi Minh City (so "200 Phan Anh" means the one in HCMC).
// It is only a bias: an address in another city still works when it names the city.
//   GEOCODE_BIAS=off              turns the bias off
//   GEOCODE_VIEWBOX=l,t,r,b       use another area (lon,lat of top-left, then bottom-right)
const { reason } = require('./netError');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const PHOTON = 'https://photon.komoot.io/api/';
const MIN_GAP_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const TIMEOUT_MS = 8000;

const biasOn = () => process.env.GEOCODE_BIAS !== 'off';
const viewbox = () => process.env.GEOCODE_VIEWBOX || '106.36,11.16,107.03,10.35';
const biasCenter = () => {
    const [l, t, r, b] = viewbox().split(',').map(Number);
    return { lon: (l + r) / 2, lat: (t + b) / 2 };
};


async function getJson(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function viaNominatim(q) {
    const url = new URL(NOMINATIM);
    const params = { q, format: 'jsonv2', limit: '1', countrycodes: 'vn', 'accept-language': 'en' };
    if (biasOn()) { params.viewbox = viewbox(); params.bounded = '0'; }
    url.search = new URLSearchParams(params);
    const [hit] = await getJson(url);
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
}

async function viaPhoton(q) {
    const url = new URL(PHOTON);
    const params = { q, limit: '5' };
    if (biasOn()) { const c = biasCenter(); params.lat = String(c.lat); params.lon = String(c.lon); }
    url.search = new URLSearchParams(params);
    const json = await getJson(url);
    const hit = (json.features || []).find((f) => f.properties?.countrycode === 'VN');
    if (!hit) return null;
    const p = hit.properties;
    const [lng, lat] = hit.geometry.coordinates;
    return { lat, lng, label: [p.name, p.street, p.district, p.city, p.state].filter(Boolean).join(', ') };
}

const PROVIDERS = [['Nominatim', viaNominatim], ['Photon', viaPhoton]];

// null = the service answered "no such place". Throws only if NO service could be reached.
async function lookup(q) {
    const failures = [];
    for (const [name, search] of PROVIDERS) {
        try {
            return await enqueue(() => search(q));
        } catch (err) {
            failures.push(`${name}: ${reason(err)}`);
        }
    }
    throw new Error(failures.join('; '));
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
        const r = await lookup(q);
        if (r) { found = { ...r, approximate: i > 0 }; break; }
    }
    // A single-part address like "200 Phan Anh" has no comma to drop: retry without the leading number.
    if (!found && parts.length === 1) {
        const withoutNumber = parts[0].replace(/^\d+[\w/-]*\s+/, '');
        if (withoutNumber !== parts[0] && withoutNumber.length >= 3) {
            const r = await lookup(withoutNumber);
            if (r) found = { ...r, approximate: true };
        }
    }

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { value: found, expires: Date.now() + CACHE_TTL_MS });
    return found;
}

module.exports = { geocode };
