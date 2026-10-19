const express = require('express');
const router = express.Router();
const { getRecommendations, getEligibleForNgo } = require('../controllers/matchingController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/recommendations', protect, authorizeRoles('coordinator'), getRecommendations);
router.get('/eligible-for-ngo', protect, authorizeRoles('ngo', 'coordinator'), getEligibleForNgo);

module.exports = router;
