const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const C = require('../controllers/RoomController');
const { protect } = require('../middlewares/auth');
const { restrictTo, assignRoomId, loadOwnedRoom } = require('../middlewares/role');
const { uploadPhotos } = require('../config/storage');
const { ROLES } = require('../common/constant');

const landlord = restrictTo(ROLES.LANDLORD);
const tenant = restrictTo(ROLES.TENANT);

// Each search can call the free map services, so keep it modest per IP.
const searchLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many searches. Please wait a moment' },
});

router.use(protect);

// Tenant
router.get('/search', tenant, searchLimiter, C.searchRooms);
router.post('/:id/view3d', tenant, C.recordView3d);
router.get('/:id/contact', tenant, C.getContact);

// Landlord. Order matters: auth + ownership are checked BEFORE multer writes any file.
router.get('/mine', landlord, C.getMyRooms);
router.post('/', landlord, assignRoomId, uploadPhotos, C.createRoom);
router.get('/:id', landlord, loadOwnedRoom, C.getMyRoom);
router.patch('/:id/status', landlord, loadOwnedRoom, C.setRoomStatus);
router.patch('/:id', landlord, loadOwnedRoom, uploadPhotos, C.updateRoom);

module.exports = router;
