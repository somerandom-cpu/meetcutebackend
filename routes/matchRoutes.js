const express = require('express');
const router = express.Router();
const { isAuthenticated, isUser } = require('../middleware/auth');
const { checkSwipeLimit } = require('../middleware/usageLimits');
const matchController = require('../controllers/matchController');
const { searchRateLimiter } = require('../middleware/rateLimiter');
const { requireTier } = require('../middleware/requireTier');

// Protected routes (require authentication)
router.get('/likes-you', isAuthenticated, isUser, requireTier('Premium'), matchController.getLikesYou);
router.get('/likesyou', isAuthenticated, isUser, requireTier('Premium'), matchController.getLikesYou); // alias fallback
router.get('/suggestions', isAuthenticated, isUser, searchRateLimiter, checkSwipeLimit, matchController.getPotentialMatches);
router.post('/like/:id', isAuthenticated, isUser, checkSwipeLimit, matchController.likeProfile);
router.get('/', isAuthenticated, isUser, matchController.getMatches);
router.post('/', isAuthenticated, isUser, matchController.checkAndCreateMatch);
router.delete('/:matchId', isAuthenticated, isUser, matchController.unmatch);

module.exports = router;