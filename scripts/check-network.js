// Run:  npm run check:net
// Tests, from THIS machine, every outside service the app uses, and says what is blocked.
const dns = require('dns').promises;
const UA = `RoommateFinder/1.0 (${process.env.NOMINATIM_CONTACT || 'dev'})`;
const reason = (err) => err?.cause?.code || err?.cause?.message || err?.message || String(err);

const CHECKS = [
    ['Address lookup  (Nominatim)', 'https://nominatim.openstreetmap.org/search?q=Ben+Thanh+Market&format=json&limit=1'],
    ['Address lookup  (Photon, backup)', 'https://photon.komoot.io/api/?q=Ben+Thanh+Market&limit=1'],
    ['Map tiles       (OpenStreetMap)', 'https://tile.openstreetmap.org/0/0/0.png'],
    ['Map tiles       (OSM France)', 'https://a.tile.openstreetmap.fr/osmfr/0/0/0.png'],
    ['Map tiles       (Esri)', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/0/0/0'],
];
// Overpass is asked exactly like the app asks it (POST with a tiny query)
const OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

(async () => {
    console.log(`Node ${process.version}, User-Agent: ${UA}\n`);
    try {
        const addrs = await dns.lookup('nominatim.openstreetmap.org', { all: true });
        console.log('DNS nominatim.openstreetmap.org ->', addrs.map((a) => a.address).join(', '), '\n');
    } catch (err) {
        console.log('DNS nominatim.openstreetmap.org -> FAILED:', reason(err), '\n');
    }
    let okCount = 0;
    let total = CHECKS.length + OVERPASS.length;
    for (const [name, url] of CHECKS) {
        const t = Date.now();
        try {
            const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
            const good = res.ok;
            if (good) okCount++;
            console.log(`${good ? 'OK  ' : 'FAIL'}  ${name}  HTTP ${res.status}  ${Date.now() - t} ms`);
        } catch (err) {
            console.log(`FAIL  ${name}  ${reason(err)}  ${Date.now() - t} ms`);
        }
    }
    for (const endpoint of OVERPASS) {
        const t = Date.now();
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: '*/*', 'User-Agent': UA },
                body: new URLSearchParams({ data: '[out:json][timeout:10];node(1);out;' }),
                signal: AbortSignal.timeout(15000),
            });
            if (res.ok) okCount++;
            console.log(`${res.ok ? 'OK  ' : 'FAIL'}  Nearby places   (${new URL(endpoint).host})  HTTP ${res.status}  ${Date.now() - t} ms`);
        } catch (err) {
            console.log(`FAIL  Nearby places   (${new URL(endpoint).host})  ${reason(err)}  ${Date.now() - t} ms`);
        }
    }
    console.log(okCount === total
        ? '\nEverything is reachable.'
        : '\nSome services are unreachable from this machine. Send this output to whoever is helping you.');
})();
