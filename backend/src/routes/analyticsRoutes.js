const express = require('express');
const router = express.Router();
const { getOverviewAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Public route so landing page and impact overview can show live community statistics
router.get('/overview', getOverviewAnalytics);

module.exports = router;
