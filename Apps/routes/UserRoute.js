const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getMe } = require('../controllers/UserController');
const { protect } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimit');

router.route('/register').post(authLimiter, registerUser);
router.route('/login').post(authLimiter, loginUser);
router.route('/logout').post(logoutUser);
router.route('/me').get(protect, getMe);

module.exports = router;
