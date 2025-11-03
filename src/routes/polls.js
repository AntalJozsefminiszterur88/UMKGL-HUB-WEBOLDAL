const express = require('express');
const router = express.Router();
const pollsController = require('../controllers/pollsController');
const { authenticateToken, optionalAuthenticate } = require('../middleware/authMiddleware');

router.get('/', optionalAuthenticate, pollsController.getPolls);
router.post('/', authenticateToken, pollsController.createPoll);
router.post('/:pollId/vote', authenticateToken, pollsController.vote);
router.post('/:pollId/close', authenticateToken, pollsController.closePoll);

module.exports = router;
