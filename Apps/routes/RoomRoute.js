const express = require('express');
const router = express.Router();
const C = require('../controllers/RoomController');
const { protect } = require('../middlewares/auth');
const { restrictTo, assignRoomId, loadOwnedRoom } = require('../middlewares/role');
const { uploadPhotos } = require('../config/storage');
const { ROLES } = require('../common/constant');

const landlord = restrictTo(ROLES.LANDLORD);

router.use(protect);

// Landlord. Order matters: auth + ownership are checked BEFORE multer writes any file.
router.get('/mine', landlord, C.getMyRooms);
router.post('/', landlord, assignRoomId, uploadPhotos, C.createRoom);
router.get('/:id', landlord, loadOwnedRoom, C.getMyRoom);
router.patch('/:id/status', landlord, loadOwnedRoom, C.setRoomStatus);
router.patch('/:id', landlord, loadOwnedRoom, uploadPhotos, C.updateRoom);

module.exports = router;
