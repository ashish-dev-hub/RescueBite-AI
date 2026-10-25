const Demand = require('../models/Demand');
const mlClient = require('../services/mlClient');

// @desc    Create a new NGO demand entry
// @route   POST /api/demands
// @access  Private (ngo only)
const createDemand = async (req, res, next) => {
  try {
    const {
      requestedMeals,
      beneficiaryCount,
      neededBy,
      receivingCapacity,
      location,
      urgency,
      dietaryPreferences,
      notes,
    } = req.body;

    if (!requestedMeals || !beneficiaryCount || !neededBy) {
      return res.status(400).json({
        success: false,
        message: 'Requested meals, beneficiary count, and needed-by time are required',
      });
    }

    const meals = parseInt(requestedMeals, 10);
    const beneficiaries = parseInt(beneficiaryCount, 10);
    const capacity = parseInt(receivingCapacity || req.user.receivingCapacity || meals, 10);

    if (isNaN(meals) || meals <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Requested meals must be a positive integer',
      });
    }

    if (isNaN(beneficiaries) || beneficiaries <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Beneficiary count must be a positive integer',
      });
    }

    const neededByDate = new Date(neededBy);
    if (neededByDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Needed-by time must be in the future',
      });
    }

    const demandLocation = location || req.user.location || { address: 'Local NGO location' };

    const demand = await Demand.create({
      ngoId: req.user._id,
      ngoName: req.user.organization || req.user.name,
      requestedMeals: meals,
      fulfilledMeals: 0,
      beneficiaryCount: beneficiaries,
      neededBy: neededByDate,
      receivingCapacity: capacity,
      location: demandLocation,
      urgency: urgency || 'standard',
      dietaryPreferences: dietaryPreferences || [],
      notes: notes || '',
      status: 'open',
    });

    res.status(201).json({
      success: true,
      demand,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demands (role-scoped)
// @route   GET /api/demands
// @access  Private
const getDemands = async (req, res, next) => {
  try {
    const { status, urgency, ownOnly } = req.query;
    let query = {};

    if (req.user.role === 'ngo' || ownOnly === 'true') {
      if (req.user.role === 'ngo') {
        query.ngoId = req.user._id;
      }
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    const demands = await Demand.find(query).sort({ neededBy: 1 });

    res.json({
      success: true,
      count: demands.length,
      demands,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current NGO's demands
// @route   GET /api/demands/my
// @access  Private (ngo only)
const getMyDemands = async (req, res, next) => {
  try {
    const demands = await Demand.find({ ngoId: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: demands.length,
      demands,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update demand entry
// @route   PATCH /api/demands/:id
// @access  Private (owning NGO only)
const updateDemand = async (req, res, next) => {
  try {
    const demand = await Demand.findById(req.params.id);
    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Demand record not found',
      });
    }

    if (demand.ngoId.toString() !== req.user._id.toString() && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own demand requests',
      });
    }

    if (demand.status === 'fulfilled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a demand that is already fulfilled',
      });
    }

    const allowedUpdates = [
      'requestedMeals',
      'beneficiaryCount',
      'neededBy',
      'receivingCapacity',
      'urgency',
      'dietaryPreferences',
      'notes',
      'location',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        demand[field] = req.body[field];
      }
    });

    if (req.body.neededBy) {
      const neededByDate = new Date(req.body.neededBy);
      if (neededByDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Needed-by time must be in the future',
        });
      }
      demand.neededBy = neededByDate;
    }

    await demand.save();

    res.json({
      success: true,
      demand,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a demand request
// @route   PATCH /api/demands/:id/cancel
// @access  Private (owning NGO only)
const cancelDemand = async (req, res, next) => {
  try {
    const demand = await Demand.findById(req.params.id);
    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Demand record not found',
      });
    }

    if (demand.ngoId.toString() !== req.user._id.toString() && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only cancel your own demands',
      });
    }

    demand.status = 'cancelled';
    await demand.save();

    res.json({
      success: true,
      message: 'Demand successfully cancelled',
      demand,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Model A AI meal demand forecast for an NGO
// @route   GET /api/demands/forecast
// @access  Private (ngo or coordinator)
const getDemandForecast = async (req, res, next) => {
  try {
    let ngoId = req.query.ngoId;
    if (!ngoId) {
      if (req.user && req.user.ngoCode) {
        ngoId = req.user.ngoCode;
      } else if (req.user && req.user._id) {
        // Map Mongo ObjectId deterministically to one of the 30 dataset NGOs (N001-N030)
        const hash = String(req.user._id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const num = (hash % 30) + 1;
        ngoId = `N${String(num).padStart(3, '0')}`;
      } else {
        ngoId = 'N001';
      }
    }

    const targetDate =
      req.query.targetDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const forecast = await mlClient.getDemandForecast(String(ngoId), String(targetDate));

    if (!forecast) {
      return res.json({
        success: true,
        isFallback: true,
        ngo_id: ngoId,
        forecast_date: targetDate,
        predicted_meals: req.user.receivingCapacity
          ? Math.round(req.user.receivingCapacity * 0.75)
          : 80,
        confidence_lower: req.user.receivingCapacity
          ? Math.round(req.user.receivingCapacity * 0.5)
          : 50,
        confidence_upper: req.user.receivingCapacity ? req.user.receivingCapacity : 120,
        disclaimer: 'Fallback estimate: ML serving service offline.',
      });
    }

    res.json({
      success: true,
      ...forecast,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDemand,
  getDemands,
  getMyDemands,
  updateDemand,
  cancelDemand,
  getDemandForecast,
};
