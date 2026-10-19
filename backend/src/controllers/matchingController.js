const Donation = require('../models/Donation');
const Demand = require('../models/Demand');
const { generateMatches } = require('../services/matchingService');

// @desc    Generate constraint-aware match recommendations for Coordinator Allocation Desk
// @route   POST /api/matching/recommendations
// @access  Private (coordinator only)
const getRecommendations = async (req, res, next) => {
  try {
    const now = new Date();

    // Fetch active donations
    const donations = await Donation.find({
      status: { $in: ['available', 'reserved'] },
      remainingQuantity: { $gt: 0 },
      pickupDeadline: { $gt: now },
    }).populate('donorId', 'name organization phone location');

    // Fetch open demands
    const demands = await Demand.find({
      status: { $in: ['open', 'partially_fulfilled'] },
      neededBy: { $gt: now },
    }).populate('ngoId', 'name organization phone location receivingCapacity');

    const recommendations = generateMatches(donations, demands);

    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
      meta: {
        totalActiveDonations: donations.length,
        totalOpenDemands: demands.length,
        algorithm: 'Deterministic Constraint-Aware Ranking Engine v1.0',
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get eligible nearby surplus donations for a specific NGO
// @route   GET /api/matching/eligible-for-ngo
// @access  Private (ngo or coordinator)
const getEligibleForNgo = async (req, res, next) => {
  try {
    const now = new Date();
    const ngoId = req.user.role === 'ngo' ? req.user._id : req.query.ngoId;

    const donations = await Donation.find({
      status: { $in: ['available', 'reserved'] },
      remainingQuantity: { $gt: 0 },
      pickupDeadline: { $gt: now },
    });

    const demands = await Demand.find({
      ngoId,
      status: { $in: ['open', 'partially_fulfilled'] },
      neededBy: { $gt: now },
    }).populate('ngoId', 'name organization receivingCapacity location');

    const matches = generateMatches(donations, demands);

    res.json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getEligibleForNgo,
};
