const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

exports.createRoom = async (req, res, next) => {
  try {
    const { name, isPrivate, passcode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required.' });
    }

    const roomData = {
      name,
      host: req.user._id,
      isPrivate: isPrivate || false,
    };

    if (isPrivate && passcode) {
      roomData.passcode = passcode;
    }

    const room = await Room.create(roomData);
    await room.populate('host', 'username avatar');

    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
};

exports.getRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).populate('host', 'username avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.isPrivate) {
      const { passcode } = req.query;
      if (!passcode || passcode !== (await Room.findOne({ roomId }).select('+passcode')).passcode) {
        return res.status(403).json({ error: 'Invalid passcode.' });
      }
    }

    res.json({ room });
  } catch (err) {
    next(err);
  }
};

exports.getUserRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ host: req.user._id })
      .sort({ createdAt: -1 })
      .populate('host', 'username avatar')
      .select('-whiteboardData');

    res.json({ rooms });
  } catch (err) {
    next(err);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the room host can delete this room.' });
    }

    await room.deleteOne();
    res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.saveWhiteboard = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { data } = req.body;

    await Room.findOneAndUpdate({ roomId }, { whiteboardData: data });
    res.json({ message: 'Whiteboard saved.' });
  } catch (err) {
    next(err);
  }
};
