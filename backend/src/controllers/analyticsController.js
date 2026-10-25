const Donation = require('../models/Donation');
const Demand = require('../models/Demand');
const Allocation = require('../models/Allocation');

// @desc    Get aggregate impact and operational analytics
// @route   GET /api/analytics/overview
// @access  Private (authenticated, role-scoped metrics)
const getOverviewAnalytics = async (req, res, next) => {
  try {
    // 1. Total delivered allocations
    const deliveredAllocations = await Allocation.find({ status: 'delivered' }).populate('donationId');

    const totalDeliveredMeals = deliveredAllocations.reduce((acc, curr) => acc + (curr.approvedMeals || 0), 0);

    // 2. All approved / committed allocations
    const allAllocations = await Allocation.find();
    const totalApprovedMeals = allAllocations
      .filter((a) => ['approved', 'accepted', 'picked_up', 'delivered'].includes(a.status))
      .reduce((acc, curr) => acc + (curr.approvedMeals || 0), 0);

    // Fulfilment rate: delivered quantity / approved quantity * 100
    const fulfilmentRate = totalApprovedMeals > 0
      ? Math.round((totalDeliveredMeals / totalApprovedMeals) * 100)
      : 0;

    // 3. Demands & Demand Coverage
    const allDemands = await Demand.find();
    const totalRequestedMeals = allDemands.reduce((acc, curr) => acc + (curr.requestedMeals || 0), 0);
    const demandCoverageRate = totalRequestedMeals > 0
      ? Math.round((totalDeliveredMeals / totalRequestedMeals) * 100)
      : 0;

    // 4. On-time delivery
    let onTimeCount = 0;
    let applicableDeliveries = 0;
    deliveredAllocations.forEach((alloc) => {
      if (alloc.deliveredAt && alloc.donationId && alloc.donationId.pickupDeadline) {
        applicableDeliveries++;
        if (new Date(alloc.deliveredAt) <= new Date(alloc.donationId.pickupDeadline)) {
          onTimeCount++;
        }
      }
    });
    const onTimeDeliveryRate = applicableDeliveries > 0
      ? Math.round((onTimeCount / applicableDeliveries) * 100)
      : 0;

    // 5. Waste Avoided and Environmental Impact Estimates
    // Factors: 0.45 kg edible food per meal; 1.2 kg CO2e avoided per kg food rescued (WRAP/EPA methodology)
    const estimatedKgFoodSaved = Math.round(totalDeliveredMeals * 0.45 * 10) / 10;
    const estimatedCo2KgAvoided = Math.round(estimatedKgFoodSaved * 1.2 * 10) / 10;

    // 6. Active operational counts
    const activeDonationsCount = await Donation.countDocuments({
      status: { $in: ['available', 'reserved'] },
      pickupDeadline: { $gt: new Date() },
    });

    const openDemandsCount = await Demand.countDocuments({
      status: { $in: ['open', 'partially_fulfilled'] },
    });

    const pendingAllocationsCount = await Allocation.countDocuments({
      status: { $in: ['approved', 'accepted', 'picked_up'] },
    });

    // 7. Recent activity feed
    const recentAllocations = await Allocation.find()
      .populate('donationId', 'foodName donorName category')
      .populate('ngoId', 'name organization')
      .sort({ updatedAt: -1 })
      .limit(6);

    res.json({
      success: true,
      metrics: {
        totalDeliveredMeals,
        totalApprovedMeals,
        fulfilmentRate,
        demandCoverageRate,
        onTimeDeliveryRate,
        activeDonationsCount,
        openDemandsCount,
        pendingAllocationsCount,
        environmentalEstimates: {
          kgFoodSaved: estimatedKgFoodSaved,
          co2KgAvoided: estimatedCo2KgAvoided,
          methodologyNotes:
            'Estimated using 0.45 kg per standard meal and 1.2 kg CO2e avoided per kg food redirected. Applied strictly to confirmed delivered meals.',
        },
      },
      recentActivity: recentAllocations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverviewAnalytics,
};
