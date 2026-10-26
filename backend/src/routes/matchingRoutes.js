const express = require('express');
const router = express.Router();
const {
  getRecommendations,
  getEligibleForNgo,
  getModelStatus,
} = require('../controllers/matchingController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/recommendations', protect, authorizeRoles('coordinator'), getRecommendations);
router.get('/recommendations', protect, authorizeRoles('coordinator'), getRecommendations);
router.get('/eligible-for-ngo', protect, authorizeRoles('ngo', 'coordinator'), getEligibleForNgo);
router.get('/model-status', protect, getModelStatus);

module.exports = router;
