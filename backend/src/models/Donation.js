const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donorName: {
      type: String,
      required: true,
    },
    donorOrg: {
      type: String,
      default: '',
    },
    foodName: {
      type: String,
      required: [true, 'Food name/description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Prepared Hot Meals',
        'Fresh Produce & Fruits',
        'Bakery & Bread',
        'Packaged & Canned Goods',
        'Dairy & Chilled Items',
        'Beverages & Snacks',
      ],
      default: 'Prepared Hot Meals',
    },
    quantityMeals: {
      type: Number,
      required: [true, 'Quantity in meals is required'],
      min: [1, 'Quantity must be at least 1 meal'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
    },
    preparedAt: {
      type: Date,
      default: Date.now,
    },
    storageInfo: {
      type: String,
      enum: ['Refrigerated (4°C)', 'Room Temperature', 'Frozen (-18°C)', 'Hot Holding (60°C+)'],
      default: 'Refrigerated (4°C)',
    },
    pickupDeadline: {
      type: Date,
      required: [true, 'Pickup deadline is required'],
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
    dietaryInfo: {
      type: [String],
      default: [],
    },
    specialInstructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'allocated', 'picked_up', 'delivered', 'cancelled'],
      default: 'available',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to check if listing has expired
donationSchema.virtual('isExpired').get(function () {
  return this.pickupDeadline && new Date() > this.pickupDeadline;
});

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;
