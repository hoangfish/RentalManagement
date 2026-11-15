// Mirrors HTTP_SERVER/Apps/common/validators.js so users get instant feedback.
// The server stays the source of truth and re-checks everything.
import { ROLES, MIN_PHOTOS, MAX_PHOTOS, PANORAMA_LABEL_MAX } from './constant.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10,11}$/;
export const PASSWORD_MIN_LENGTH = 8;

export const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase();

export const normalizePhone = (v) => {
  let p = String(v ?? '').replace(/[\s.\-()]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length >= 11) p = '0' + p.slice(2);
  return p;
};

const validRole = (role) => Object.values(ROLES).includes(role);

function checkPassword(password, errors) {
  if (!password) errors.password = 'Please enter a password';
  else if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  else if (new TextEncoder().encode(password).length > 72) errors.password = 'Password is too long';
}

export function validateRegister({ firstName, lastName, phone, email, password, role }) {
  const errors = {};
  if (!validRole(role)) errors.role = 'Please choose what you want to do';
  if (!String(firstName ?? '').trim()) errors.firstName = 'Please enter your first name';
  if (!String(lastName ?? '').trim()) errors.lastName = 'Please enter your last name';
  if (!PHONE_RE.test(normalizePhone(phone))) errors.phone = 'Phone number must be 10-11 digits';
  if (!EMAIL_RE.test(normalizeEmail(email))) errors.email = 'Please enter a valid email address';
  checkPassword(password, errors);
  return errors;
}

export function validateLogin({ emailOrPhone, password, role }) {
  const errors = {};
  const raw = String(emailOrPhone ?? '').trim();
  if (!raw) errors.emailOrPhone = 'Please enter your email or phone number';
  else if (raw.includes('@')) {
    if (!EMAIL_RE.test(normalizeEmail(raw))) errors.emailOrPhone = 'Please enter a valid email address';
  } else if (!PHONE_RE.test(normalizePhone(raw))) errors.emailOrPhone = 'Phone number must be 10-11 digits';
  if (!password) errors.password = 'Please enter your password';
  if (!validRole(role)) errors.role = 'Please choose what you want to do';
  return errors;
}

export const firstError = (errors) => Object.values(errors)[0];

// ---------------------------------------------------------------------------
// Rooms (mirrors HTTP_SERVER/Apps/common/roomValidators.js)
// ---------------------------------------------------------------------------
// "4,500,000", "4.500.000" and "4500000" all mean 4500000
export const parseMoney = (v) => {
  const s = String(v ?? '').replace(/[.,\s]/g, '');
  return /^\d+$/.test(s) ? Number(s) : NaN;
};
export const parseArea = (v) => {
  const s = String(v ?? '').trim().replace(',', '.');
  return s !== '' && /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

// publish=false (draft): only the title is required, but whatever is filled in must be valid.
export function validateRoom({ ownerName, title, address, area, price, maxPeople, description }, { publish, photoCount, panoramaLabel }) {
  const errors = {};
  const t = String(title ?? '').trim();
  const a = String(address ?? '').trim();

  if (!t) errors.title = 'Please enter a room name / title';
  else if (t.length < 3 || t.length > 100) errors.title = 'Title must be 3-100 characters';

  if (publish && !String(ownerName ?? '').trim()) errors.ownerName = 'Please enter the owner’s name';
  if (publish && !a) errors.address = 'Please enter the room’s address';
  else if (a && (a.length < 5 || a.length > 200)) errors.address = 'Address must be 5-200 characters';

  if (String(description ?? '').trim().length > 2000) errors.description = 'Description must be under 2000 characters';

  const numeric = [
    ['area', area, parseArea, (n) => n >= 5 && n <= 1000, 'Area must be between 5 and 1000 m²', 'Please enter the area'],
    ['price', price, parseMoney, (n) => n >= 100000 && n <= 1e9, 'Rent must be between 100,000 and 1,000,000,000 đ', 'Please enter the monthly rent'],
    ['maxPeople', maxPeople, parseMoney, (n) => n >= 1 && n <= 20, 'Max people must be between 1 and 20', 'Please enter the max number of people'],
  ];
  for (const [field, raw, parse, inRange, badMsg, missingMsg] of numeric) {
    if (String(raw ?? '').trim() === '') { if (publish) errors[field] = missingMsg; continue; }
    const n = parse(raw);
    if (Number.isNaN(n) || !inRange(n)) errors[field] = badMsg;
  }

  if (photoCount > MAX_PHOTOS) errors.photos = `You can upload at most ${MAX_PHOTOS} photos`;
  else if (publish && photoCount < MIN_PHOTOS) {
    errors.photos = 'Add at least one photo of the room (it becomes the cover)';
  }
  if (String(panoramaLabel ?? '').trim().length > PANORAMA_LABEL_MAX) {
    errors.panoramas = `The 360° photo name must be at most ${PANORAMA_LABEL_MAX} characters`;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Tenant search form
// ---------------------------------------------------------------------------

// One amount: "4500000", "4,500,000", "4.500.000", "4.5tr", "3tr", "800k"
function parseAmount(token) {
  const t = token.trim().replace(/\s+/g, '');
  const m = t.match(/^(\d+(?:[.,]\d+)*)(triệu|trieu|tr|m|nghìn|nghin|k)?$/);
  if (!m) return NaN;
  const [, digits, unit] = m;
  if (!unit) {
    const v = Number(digits.replace(/[.,]/g, ''));
    return v >= 1000 ? v : NaN; // "3" alone is ambiguous: ask for 3tr or 3,000,000
  }
  // with a unit, "4.5tr" / "4,5tr" mean 4.5 million
  const value = Number(digits.replace(',', '.'));
  return Math.round(value * (['k', 'nghìn', 'nghin'].includes(unit) ? 1e3 : 1e6));
}

// "3,000,000 – 5,000,000 đ", "3tr-5tr", "5000000" (= up to 5,000,000). Empty = no limit.
// Returns { min, max } (numbers or null) or { error }.
export function parsePriceRange(raw) {
  const text = String(raw ?? '').toLowerCase().replace(/vnđ|vnd|đ/g, '').trim();
  if (!text) return { min: null, max: null };
  const parts = text.split(/\s*[-–—]\s*|\s+to\s+|\s+đến\s+/).filter(Boolean);
  const nums = parts.map(parseAmount);
  const bad = { error: 'Enter a price like 3,000,000 – 5,000,000 (or 3tr – 5tr)' };
  if (!parts.length || parts.length > 2 || nums.some((n) => Number.isNaN(n))) return bad;
  if (nums.length === 1) return { min: null, max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export function validateSearch({ radiusKm, price, minArea }) {
  const errors = {};
  const radius = String(radiusKm ?? '').trim();
  if (radius !== '') {
    const r = parseArea(radius);
    if (Number.isNaN(r) || r < 0.1 || r > 50) errors.radiusKm = 'Radius must be between 0.1 and 50 km';
  }
  const range = parsePriceRange(price);
  if (range.error) errors.price = range.error;
  const area = String(minArea ?? '').trim();
  if (area !== '') {
    const a = parseArea(area);
    if (Number.isNaN(a) || a > 1000) errors.minArea = 'Enter the minimum area in m², e.g. 20';
  }
  return errors;
}
