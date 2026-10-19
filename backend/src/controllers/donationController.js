const Donation = require('../models/Donation');
const Allocation = require('../models/Allocation');

// @desc    Create a new surplus donation listing
// @route   POST /api/donations
// @access  Private (donor only)
const createDonation = async (req, res, next) => {
  try {
    const {
      foodName,
      category,
      quantityMeals,
      preparedAt,
      storageInfo,
      pickupDeadline,
      location,
      dietaryInfo,
      specialInstructions,
    } = req.body;

    if (!foodName || !quantityMeals || !pickupDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Food name, quantity in meals, and pickup deadline are required',
      });
    }

    const qty = parseInt(quantityMeals, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    const deadline = new Date(pickupDeadline);
    if (deadline <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Pickup deadline must be in the future',
      });
    }

    const donationLocation = location || req.user.location || { address: 'Local donor location' };

    const donation = await Donation.create({
      donorId: req.user._id,
      donorName: req.user.name,
      donorOrg: req.user.organization || req.user.name,
      foodName,
      category: category || 'Prepared Hot Meals',
      quantityMeals: qty,
      remainingQuantity: qty,
      preparedAt: preparedAt || new Date(),
      storageInfo: storageInfo || 'Refrigerated (4°C)',
      pickupDeadline: deadline,
      location: donationLocation,
      dietaryInfo: dietaryInfo || [],
      specialInstructions: specialInstructions || '',
      status: 'available',
    });

    res.status(201).json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get donations (scoped by role and filters)
// @route   GET /api/donations
// @access  Private
const getDonations = async (req, res, next) => {
  try {
    const { status, category, ownOnly } = req.query;
    let query = {};

    // Donors viewing their own donations or NGO/coordinator views
    if (req.user.role === 'donor' || ownOnly === 'true') {
      if (req.user.role === 'donor') {
        query.donorId = req.user._id;
      }
    } else if (req.user.role === 'ngo') {
      // NGOs see available listings with future deadlines
      query.status = { $in: ['available', 'reserved'] };
      query.pickupDeadline = { $gt: new Date() };
      query.remainingQuantity = { $gt: 0 };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    const donations = await Donation.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single donation by ID
// @route   GET /api/donations/:id
// @access  Private
const getDonationById = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation listing not found',
      });
    }

    res.json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a donation listing
// @route   PATCH /api/donations/:id
// @access  Private (owning donor only)
const updateDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation listing not found',
      });
    }

    // Ownership check
    if (donation.donorId.toString() !== req.user._id.toString() && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own donations',
      });
    }

    // Disallow editing if already picked up or delivered
    if (['picked_up', 'delivered'].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit listing in '${donation.status}' state`,
      });
    }

    const allowedUpdates = [
      'foodName',
      'category',
      'storageInfo',
      'pickupDeadline',
      'specialInstructions',
      'location',
      'dietaryInfo',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        donation[field] = req.body[field];
      }
    });

    if (req.body.pickupDeadline) {
      const deadline = new Date(req.body.pickupDeadline);
      if (deadline <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Pickup deadline must be in the future',
        });
      }
      donation.pickupDeadline = deadline;
    }

    await donation.save();

    res.json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel donation listing
// @route   PATCH /api/donations/:id/cancel
// @access  Private (owning donor or coordinator)
const cancelDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation listing not found',
      });
    }

    if (donation.donorId.toString() !== req.user._id.toString() && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only cancel your own donations',
      });
    }

    if (['picked_up', 'delivered'].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel listing that is already ${donation.status}`,
      });
    }

    donation.status = 'cancelled';
    donation.remainingQuantity = 0;
    await donation.save();

    // Also cancel any non-completed allocations for this donation
    await Allocation.updateMany(
      { donationId: donation._id, status: { $in: ['proposed', 'approved'] } },
      {
        status: 'cancelled',
        notes: `Cancelled because donation was cancelled by ${req.user.role}`,
      }
    );

    res.json({
      success: true,
      message: 'Donation successfully cancelled',
      donation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  cancelDonation,
};
