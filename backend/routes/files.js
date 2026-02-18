const express = require('express');
const router = express.Router();
const { uploadFile, getRoomFiles } = require('../controllers/files');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/:roomId/upload', upload.single('file'), uploadFile);
router.get('/:roomId', getRoomFiles);

module.exports = router;
