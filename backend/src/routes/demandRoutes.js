const express = require('express');
const router = express.Router();
const {
  createDemand,
  getDemands,
  getMyDemands,
  updateDemand,
  cancelDemand,
} = require('../controllers/demandController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRoles('ngo'), createDemand);
router.get('/', protect, getDemands);
router.get('/my', protect, authorizeRoles('ngo'), getMyDemands);
router.patch('/:id', protect, authorizeRoles('ngo', 'coordinator'), updateDemand);
router.patch('/:id/cancel', protect, authorizeRoles('ngo', 'coordinator'), cancelDemand);

module.exports = router;
