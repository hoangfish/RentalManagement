// Counterpart of Pkg/Common/constant.h in the hotel project.
export const APP_NAME = 'Roommate Finder';

export const URL_SERVER_BACKEND = 'http://localhost:3000';
export const URL_SERVER_SOCKET = 'http://localhost:3001';

export const URL_USER_REGISTER = `${URL_SERVER_BACKEND}/api/v1/users/register`;
export const URL_USER_LOGIN = `${URL_SERVER_BACKEND}/api/v1/users/login`;
export const URL_USER_LOGOUT = `${URL_SERVER_BACKEND}/api/v1/users/logout`;
export const URL_USER_ME = `${URL_SERVER_BACKEND}/api/v1/users/me`;

export const URL_ROOMS = `${URL_SERVER_BACKEND}/api/v1/rooms`;
export const URL_MY_ROOMS = `${URL_ROOMS}/mine`;
export const URL_ROOMS_SEARCH = `${URL_ROOMS}/search`;

// Photos are served by the HTTP server; the API returns paths like /uploads/rooms/<id>/<file>.jpg
export const assetUrl = (path) => (/^https?:/i.test(path) ? path : `${URL_SERVER_BACKEND}${path}`);

export const ROLES = Object.freeze({
  TENANT: 'tenant',     // "Rent a room"
  LANDLORD: 'landlord', // "Rent out a room"
});

export const ROUTES = Object.freeze({
  INTRO: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',            // tenant home (room search – coming next)
  MY_ROOMS: '/rooms',       // landlord dashboard ("My rooms")
  ROOM_NEW: '/rooms/new',   // landlord: post a room
  ROOM_EDIT: '/rooms/edit', // landlord: edit a room  (#/rooms/edit?id=<roomId>)
});

// Where a signed-in user lands after login / when opening the app.
export const homeRouteFor = (role) => (role === ROLES.LANDLORD ? ROUTES.MY_ROOMS : ROUTES.HOME);

export const ROOM_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',  // shown as "Visible"
  HIDDEN: 'hidden',
  RENTED: 'rented',
});

// Keep in sync with HTTP_SERVER/Apps/common/constant.js
export const AMENITIES = ['Air conditioner', 'Mezzanine', 'Washing machine', 'Parking', 'Kitchen', 'Balcony', 'Furnished'];
// "Near ..." filters on the search page (the server works out what is around each room from OpenStreetMap)
export const NEARBY_OPTIONS = Object.freeze([
  { id: 'school', label: 'Near school' },
  { id: 'market', label: 'Near market' },
  { id: 'bus', label: 'Near bus station' },
]);
export const NEARBY_LABEL = Object.freeze(Object.fromEntries(NEARBY_OPTIONS.map((o) => [o.id, o.label])));
export const DEFAULT_RADIUS_KM = 3;

// Map pictures. Sources are tried in this order: when one cannot be loaded (blocked network, server
// down) the map moves to the next by itself. All are free without a key; check their usage terms
// before going commercial.
const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
export const MAP_TILE_SOURCES = Object.freeze([
  { name: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: 'abc', attribution: OSM },
  { name: 'OpenStreetMap France', url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', subdomains: 'abc',
    attribution: `&copy; OpenStreetMap France | ${OSM}` },
  { name: 'Esri', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', subdomains: '',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, METI, and others' },
]);

export const MIN_PHOTOS = 1;   // a posted room needs at least one normal photo (the cover)
export const MAX_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// 360° photos (keep in sync with HTTP_SERVER/Apps/common/constant.js).
// One for now; later one per spot, linked together.
export const MAX_PANORAMAS = 1;
export const MAX_PANORAMA_BYTES = 25 * 1024 * 1024;
export const PANORAMA_MIN_WIDTH = 2048;
export const PANORAMA_MAX_WIDTH = 8192;
export const PANORAMA_SHRINK_WIDTH = 5760;   // too-large photos are shrunk to this (keeps phone canvases happy)
export const PANORAMA_RATIO_TOLERANCE = 0.03; // width / height may be 2 ± 3 %
export const PANORAMA_LABEL_MAX = 40;

export const STORAGE_KEYS = Object.freeze({ TOKEN: 'rf.token' });
