const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, isAdmin, settingsController.getSettings);
router.post('/', authenticateToken, isAdmin, settingsController.updateSettings);

module.exports = router;
