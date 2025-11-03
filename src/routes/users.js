const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, isAdmin, usersController.getUsers);
router.post('/permissions/batch-update', authenticateToken, isAdmin, usersController.batchUpdatePermissions);
router.post('/profile/upload-avatar', authenticateToken, usersController.uploadAvatar);
router.post('/profile/update-name', authenticateToken, usersController.updateName);
router.post('/profile/update-password', authenticateToken, usersController.updatePassword);

module.exports = router;
