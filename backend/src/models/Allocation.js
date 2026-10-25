const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: String,
    actorRole: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const allocationSchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    demandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Demand',
    },
    recommendedMeals: {
      type: Number,
      required: true,
      min: 1,
    },
    approvedMeals: {
      type: Number,
      required: true,
      min: 1,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    reasonCodes: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['proposed', 'approved', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled'],
      default: 'proposed',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    deliveredAt: {
      type: Date,
    },
    pickedUpAt: {
      type: Date,
    },
    timeline: [timelineEventSchema],
  },
  {
    timestamps: true,
  }
);

const Allocation = mongoose.model('Allocation', allocationSchema);
module.exports = Allocation;
