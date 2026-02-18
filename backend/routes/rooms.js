const express = require('express');
const router = express.Router();
const { createRoom, getRoom, getUserRooms, deleteRoom, saveWhiteboard } = require('../controllers/rooms');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createRoom);
router.get('/my', getUserRooms);
router.get('/:roomId', getRoom);
router.delete('/:roomId', deleteRoom);
router.patch('/:roomId/whiteboard', saveWhiteboard);

module.exports = router;
