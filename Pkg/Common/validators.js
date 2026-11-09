// Mirrors HTTP_SERVER/Apps/common/validators.js so users get instant feedback.
// The server stays the source of truth and re-checks everything.
import { ROLES } from './constant.js';

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
