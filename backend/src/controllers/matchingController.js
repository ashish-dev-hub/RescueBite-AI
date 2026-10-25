const Donation = require('../models/Donation');
const Demand = require('../models/Demand');
const { generateMatches } = require('../services/matchingService');
const mlClient = require('../services/mlClient');

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

    // 1. Generate base deterministic recommendations
    const recommendations = generateMatches(donations, demands);

    // 2. Enhance with ML Model B predictions if ML service is online
    let isMlPowered = false;
    const mlOnline = await mlClient.isAvailable();

    if (mlOnline && recommendations.length > 0) {
      try {
        isMlPowered = true;
        // Batch score candidate donations
        for (const rec of recommendations) {
          const mlResult = await mlClient.getRecommendedAllocations(
            rec.donation,
            rec.donation.donorId || {},
            3
          );
          if (mlResult && mlResult.recommendations && mlResult.recommendations.length > 0) {
            const bestMlMatch = mlResult.recommendations[0];
            rec.successProbability = bestMlMatch.success_probability;
            rec.mlMatchScore = bestMlMatch.match_score;
            // Merge ML reason codes if not already present
            if (bestMlMatch.reason_codes && Array.isArray(bestMlMatch.reason_codes)) {
              const uniqueCodes = new Set([...rec.reasonCodes, ...bestMlMatch.reason_codes]);
              rec.reasonCodes = Array.from(uniqueCodes);
            }
          }
        }
      } catch (mlErr) {
        console.warn('[MatchingController] ML enhancement skipped:', mlErr.message);
      }
    }

    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
      meta: {
        totalActiveDonations: donations.length,
        totalOpenDemands: demands.length,
        isMlPowered,
        algorithm: isMlPowered
          ? 'RescueBite AI Hybrid Engine (Model B RandomForest + Hard Constraints)'
          : 'Deterministic Constraint-Aware Ranking Engine v1.0',
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

// @desc    Check status of ML service and trained models
// @route   GET /api/matching/model-status
// @access  Private
const getModelStatus = async (req, res, next) => {
  try {
    const status = await mlClient.getModelsStatus();
    if (!status) {
      return res.json({
        success: true,
        isMlAvailable: false,
        message: 'Python ML FastAPI service offline. Using deterministic heuristic fallback.',
      });
    }

    res.json({
      success: true,
      isMlAvailable: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getEligibleForNgo,
  getModelStatus,
};
