const mongoose = require('mongoose');

const demandSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ngoName: {
      type: String,
      required: true,
    },
    requestedMeals: {
      type: Number,
      required: [true, 'Requested meals quantity is required'],
      min: [1, 'Must request at least 1 meal'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
    },
    fulfilledMeals: {
      type: Number,
      default: 0,
      min: [0, 'Fulfilled meals cannot be negative'],
    },
    beneficiaryCount: {
      type: Number,
      required: [true, 'Beneficiary count is required'],
      min: [1, 'Must serve at least 1 beneficiary'],
    },
    neededBy: {
      type: Date,
      required: [true, 'Needed-by deadline is required'],
    },
    receivingCapacity: {
      type: Number,
      required: [true, 'Receiving capacity is required'],
      min: [1, 'Receiving capacity must be positive'],
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, default: '' },
      zip: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    urgency: {
      type: String,
      enum: ['standard', 'urgent', 'critical'],
      default: 'standard',
    },
    dietaryPreferences: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'partially_fulfilled', 'fulfilled', 'cancelled'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Demand = mongoose.model('Demand', demandSchema);
module.exports = Demand;
