const { ROLES, PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES } = require('./constant');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10,11}$/;

const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase();

// "+84 912 345 678", "84912345678" and "0912-345-678" all become "0912345678"
const normalizePhone = (v) => {
    let p = String(v ?? '').replace(/[\s.\-()]/g, '');
    if (p.startsWith('+84')) p = '0' + p.slice(3);
    else if (p.startsWith('84') && p.length >= 11) p = '0' + p.slice(2);
    return p;
};

const cleanName = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

function checkPassword(password, errors) {
    if (typeof password !== 'string' || password.length === 0) {
        errors.password = 'Please enter a password';
    } else if (password.length < PASSWORD_MIN_LENGTH) {
        errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    } else if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) {
        errors.password = 'Password is too long';
    }
}

function validateRegister(body = {}) {
    const errors = {};
    const value = {
        firstName: cleanName(body.firstName),
        lastName: cleanName(body.lastName),
        email: normalizeEmail(body.email),
        phone: normalizePhone(body.phone),
        role: String(body.role ?? ''),
        password: body.password,
    };

    if (!Object.values(ROLES).includes(value.role)) errors.role = 'Please choose what you want to do';
    if (!value.firstName) errors.firstName = 'Please enter your first name';
    else if (value.firstName.length > 50) errors.firstName = 'First name is too long';
    if (!value.lastName) errors.lastName = 'Please enter your last name';
    else if (value.lastName.length > 50) errors.lastName = 'Last name is too long';
    if (!PHONE_RE.test(value.phone)) errors.phone = 'Phone number must be 10-11 digits';
    if (!EMAIL_RE.test(value.email) || value.email.length > 254) errors.email = 'Please enter a valid email address';
    checkPassword(value.password, errors);

    return { errors, value };
}

function validateLogin(body = {}) {
    const errors = {};
    const raw = String(body.emailOrPhone ?? '').trim();
    const isEmail = raw.includes('@');
    const identifier = isEmail ? normalizeEmail(raw) : normalizePhone(raw);
    const role = String(body.role ?? '');
    const password = typeof body.password === 'string' ? body.password : '';

    if (!raw) errors.emailOrPhone = 'Please enter your email or phone number';
    else if (isEmail && !EMAIL_RE.test(identifier)) errors.emailOrPhone = 'Please enter a valid email address';
    else if (!isEmail && !PHONE_RE.test(identifier)) errors.emailOrPhone = 'Phone number must be 10-11 digits';
    if (!password) errors.password = 'Please enter your password';
    if (!Object.values(ROLES).includes(role)) errors.role = 'Please choose what you want to do';

    return { errors, value: { identifier, isEmail, password, role } };
}

const firstError = (errors) => Object.values(errors)[0];

module.exports = { normalizeEmail, normalizePhone, validateRegister, validateLogin, firstError };
