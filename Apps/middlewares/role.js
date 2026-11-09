const asyncHandler = require('./async');
const { AppError } = require('../common/errors');
const { RoomModel } = require('../models/RoomModel');
const { SAFE_ID } = require('../config/storage');

// Use after `protect`
const restrictTo = (...roles) => (req, res, next) =>
    roles.includes(req.user.role) ? next() : next(new AppError(403, 'You do not have permission to do that'));

// Gives uploads for a new room a folder name before multer runs
const assignRoomId = (req, res, next) => {
    req.roomId = RoomModel.newId();
    next();
};

// Loads :id and makes sure it belongs to the signed-in landlord.
// Runs BEFORE multer so nothing is written to disk for someone else's room.
const loadOwnedRoom = asyncHandler(async (req, res, next) => {
    if (!SAFE_ID.test(req.params.id)) throw new AppError(404, 'Room not found');
    const room = await RoomModel.findById(req.params.id);
    if (!room || room.ownerId !== req.user.id) throw new AppError(404, 'Room not found');
    req.room = room;
    next();
});

module.exports = { restrictTo, assignRoomId, loadOwnedRoom };
