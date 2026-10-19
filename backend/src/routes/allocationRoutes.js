const express = require('express');
const router = express.Router();
const {
  createAllocation,
  getAllocations,
  getAllocationById,
  respondAllocation,
  updateAllocationStatus,
} = require('../controllers/allocationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRoles('coordinator'), createAllocation);
router.get('/', protect, getAllocations);
router.get('/:id', protect, getAllocationById);
router.patch('/:id/respond', protect, authorizeRoles('ngo', 'coordinator'), respondAllocation);
router.patch('/:id/status', protect, authorizeRoles('donor', 'ngo', 'coordinator'), updateAllocationStatus);

module.exports = router;
