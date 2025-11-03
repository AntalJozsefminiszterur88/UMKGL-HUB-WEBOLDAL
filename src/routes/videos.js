const express = require('express');
const router = express.Router();
const videosController = require('../controllers/videosController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { loadUserUploadSettings } = require('../middleware/uploadMiddleware');

router.get('/', videosController.getVideos);
router.post('/upload', authenticateToken, loadUserUploadSettings, videosController.uploadVideo);

module.exports = router;
