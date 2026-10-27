const Allocation = require('../models/Allocation');
const Donation = require('../models/Donation');
const Demand = require('../models/Demand');

// Valid state machine transitions for Allocation lifecycle
const VALID_TRANSITIONS = {
  proposed: ['approved', 'rejected', 'cancelled'],
  approved: ['accepted', 'rejected', 'cancelled'],
  accepted: ['picked_up', 'delivered', 'cancelled'],
  picked_up: ['delivered', 'cancelled'],
  rejected: [],
  delivered: [],
  cancelled: [],
};

// @desc    Create an approved allocation
// @route   POST /api/allocations
// @access  Private (coordinator only)
const createAllocation = async (req, res, next) => {
  try {
    const {
      donationId,
      ngoId,
      demandId,
      recommendedMeals,
      approvedMeals,
      score,
      reasonCodes,
      notes,
    } = req.body;

    if (!donationId || !ngoId || !approvedMeals) {
      return res.status(400).json({
        success: false,
        message: 'Donation ID, NGO ID, and approved meal quantity are required',
      });
    }

    const qty = parseInt(approvedMeals, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Approved quantity must be a positive integer',
      });
    }

    // Atomic fetch and update on donation to prevent race conditions & over-allocation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Associated donation listing not found',
      });
    }

    if (new Date(donation.pickupDeadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot allocate from an expired donation listing',
      });
    }

    if (donation.remainingQuantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Over-allocation prevented: requested ${qty} meals, but only ${donation.remainingQuantity} meals remain available`,
      });
    }

    // Deduct remaining quantity
    donation.remainingQuantity -= qty;
    if (donation.remainingQuantity === 0) {
      donation.status = 'allocated';
    } else {
      donation.status = 'reserved';
    }
    await donation.save();

    // Create allocation
    const allocation = await Allocation.create({
      donationId,
      ngoId,
      demandId: demandId || null,
      recommendedMeals: recommendedMeals || qty,
      approvedMeals: qty,
      score: score || 0,
      reasonCodes: reasonCodes || [],
      status: 'approved',
      createdBy: req.user._id,
      notes: notes || '',
      timeline: [
        {
          status: 'approved',
          actorId: req.user._id,
          actorName: req.user.name,
          actorRole: 'coordinator',
          timestamp: new Date(),
          note: `Allocation approved for ${qty} meals`,
        },
      ],
    });

    res.status(201).json({
      success: true,
      allocation,
      donationRemaining: donation.remainingQuantity,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get allocations (scoped by role)
// @route   GET /api/allocations
// @access  Private
const getAllocations = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};

    if (req.user.role === 'ngo') {
      query.ngoId = req.user._id;
    } else if (req.user.role === 'donor') {
      // Find all donations owned by this donor
      const myDonations = await Donation.find({ donorId: req.user._id }).select('_id');
      const donationIds = myDonations.map((d) => d._id);
      query.donationId = { $in: donationIds };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const allocations = await Allocation.find(query)
      .populate('donationId')
      .populate('ngoId', 'name email organization phone location')
      .populate('demandId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: allocations.length,
      allocations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single allocation by ID
// @route   GET /api/allocations/:id
// @access  Private
const getAllocationById = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id)
      .populate('donationId')
      .populate('ngoId', 'name email organization phone location')
      .populate('demandId')
      .populate('createdBy', 'name email');

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation record not found',
      });
    }

    // Role permission check
    if (
      req.user.role === 'ngo' &&
      allocation.ngoId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view allocations assigned to other organizations',
      });
    }

    res.json({
      success: true,
      allocation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assigned NGO responds to an allocation (accept or reject)
// @route   PATCH /api/allocations/:id/respond
// @access  Private (assigned NGO only)
const respondAllocation = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'accept' or 'reject'",
      });
    }

    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation record not found',
      });
    }

    // Enforce assigned NGO ownership
    if (allocation.ngoId.toString() !== req.user._id.toString() && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned NGO can respond to this allocation',
      });
    }

    if (allocation.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to an allocation with status '${allocation.status}'. Only 'approved' allocations can be accepted or rejected.`,
      });
    }

    const donation = await Donation.findById(allocation.donationId);

    if (action === 'accept') {
      allocation.status = 'accepted';
      allocation.timeline.push({
        status: 'accepted',
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        timestamp: new Date(),
        note: 'Allocation accepted by recipient NGO',
      });

      // Update demand fulfilled meals if demand exists
      if (allocation.demandId) {
        await Demand.findByIdAndUpdate(allocation.demandId, {
          $inc: { fulfilledMeals: allocation.approvedMeals },
        });
      }
    } else {
      // Rejection: restore donation remaining quantity
      allocation.status = 'rejected';
      allocation.rejectionReason = rejectionReason || 'Declined by NGO';
      allocation.timeline.push({
        status: 'rejected',
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        timestamp: new Date(),
        note: `Allocation rejected: ${allocation.rejectionReason}`,
      });

      if (donation) {
        donation.remainingQuantity += allocation.approvedMeals;
        if (donation.status === 'allocated' && donation.remainingQuantity > 0) {
          donation.status = 'available';
        }
        await donation.save();
      }
    }

    await allocation.save();

    res.json({
      success: true,
      message: `Allocation successfully ${action}ed`,
      allocation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update allocation lifecycle status (picked_up, delivered, cancelled)
// @route   PATCH /api/allocations/:id/status
// @access  Private (authorized actors)
const updateAllocationStatus = async (req, res, next) => {
  try {
    const { nextStatus, note } = req.body;

    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation record not found',
      });
    }

    // Verify valid state transition
    const allowedNext = VALID_TRANSITIONS[allocation.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid state transition from '${allocation.status}' to '${nextStatus}'. Allowed transitions: [${allowedNext.join(', ')}]`,
      });
    }

    allocation.status = nextStatus;

    if (nextStatus === 'picked_up') {
      allocation.pickedUpAt = new Date();
      // Update donation status if all items are picked up
      await Donation.findByIdAndUpdate(allocation.donationId, { status: 'picked_up' });
    } else if (nextStatus === 'delivered') {
      if (!allocation.pickedUpAt) allocation.pickedUpAt = new Date();
      allocation.deliveredAt = new Date();
      await Donation.findByIdAndUpdate(allocation.donationId, { status: 'delivered' });
    }

    allocation.timeline.push({
      status: nextStatus,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      timestamp: new Date(),
      note: note || `Status transitioned to ${nextStatus}`,
    });

    await allocation.save();

    res.json({
      success: true,
      message: `Allocation status updated to '${nextStatus}'`,
      allocation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAllocation,
  getAllocations,
  getAllocationById,
  respondAllocation,
  updateAllocationStatus,
};
