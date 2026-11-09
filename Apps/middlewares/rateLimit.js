const rateLimit = require('express-rate-limit');

// Slows down password guessing / mass sign-ups from a single IP.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again in a few minutes' },
});

module.exports = { authLimiter };
