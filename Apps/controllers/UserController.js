const bcrypt = require('bcryptjs');
const asyncHandler = require('../middlewares/async');
const { signToken } = require('../middlewares/auth');
const { UserModel } = require('../models/UserModel');
const { BCRYPT_ROUNDS, ROLES } = require('../common/constant');
const { validateRegister, validateLogin, firstError } = require('../common/validators');

// Compared against when the account does not exist so that
// "unknown account" and "wrong password" take the same amount of time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const roleLabel = (role) => (role === ROLES.LANDLORD ? 'Rent out a room' : 'Rent a room');

const sendSession = (res, status, message, user) =>
    res.status(status).json({
        success: true,
        message,
        data: { user: UserModel.toPublic(user), token: signToken(user) },
    });

const registerUser = asyncHandler(async (req, res) => {
    const { errors, value } = validateRegister(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ success: false, message: firstError(errors), errors });
    }

    const passwordHash = await bcrypt.hash(value.password, BCRYPT_ROUNDS);
    const user = await UserModel.create({
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone,
        role: value.role,
        passwordHash,
    });

    sendSession(res, 201, 'Registration successful', user);
});

const loginUser = asyncHandler(async (req, res) => {
    const { errors, value } = validateLogin(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ success: false, message: firstError(errors), errors });
    }

    const user = await UserModel.findByIdentifier(value.identifier, value.isEmail);
    const isMatch = await bcrypt.compare(value.password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect email/phone number or password' });
    }

    // Only reveal the account's role once the password is proven correct.
    if (user.role !== value.role) {
        return res.status(403).json({
            success: false,
            message: `This account is registered to "${roleLabel(user.role)}". Please select that option to sign in`,
        });
    }

    sendSession(res, 200, 'Login successful', user);
});

// Sessions are stateless JWTs, so the client simply discards its token.
const logoutUser = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Logout successful' });
});

const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: { user: UserModel.toPublic(req.user) } });
});

module.exports = { registerUser, loginUser, logoutUser, getMe };
