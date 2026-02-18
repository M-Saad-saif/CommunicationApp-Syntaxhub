const path = require('path');
const Room = require('../models/Room');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const fileEntry = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedBy: req.user._id,
    };

    room.sharedFiles.push(fileEntry);
    await room.save();

    res.status(201).json({ file: fileEntry });
  } catch (err) {
    next(err);
  }
};

exports.getRoomFiles = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId })
      .populate('sharedFiles.uploadedBy', 'username');

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.json({ files: room.sharedFiles });
  } catch (err) {
    next(err);
  }
};
