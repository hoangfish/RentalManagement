const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const { AppError } = require('../common/errors');
const { UserModel } = require('../models/UserModel');

const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('JWT_SECRET is missing or too short. Set it in HTTP_SERVER/.env');
    }
    return secret;
};

const signToken = (user) =>
    jwt.sign({ sub: user.id, role: user.role }, getSecret(), {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

// Requires "Authorization: Bearer <token>" and puts the user on req.user
const protect = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError(401, 'Please sign in to continue');

    let payload;
    try {
        payload = jwt.verify(token, getSecret());
    } catch {
        throw new AppError(401, 'Your session has expired. Please sign in again');
    }

    const user = await UserModel.findById(payload.sub);
    if (!user) throw new AppError(401, 'Account no longer exists');
    req.user = user;
    next();
});

module.exports = { signToken, protect, getSecret };
