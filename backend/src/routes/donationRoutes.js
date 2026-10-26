const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
  getSupplyForecast,
} = require('../controllers/donationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/supply-forecast', protect, getSupplyForecast);
router.post('/', protect, authorizeRoles('donor'), createDonation);
router.get('/', protect, getDonations);
router.get('/:id', protect, getDonationById);
router.patch('/:id', protect, authorizeRoles('donor', 'coordinator'), updateDonation);
router.patch('/:id/cancel', protect, authorizeRoles('donor', 'coordinator'), cancelDonation);

module.exports = router;
