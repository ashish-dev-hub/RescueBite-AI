const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      default: '',
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['donor', 'ngo', 'coordinator'],
      required: [true, 'Role is required'],
    },
    organization: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      zip: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    receivingCapacity: {
      type: Number,
      default: 0, // applicable for NGOs (meals per delivery or per day)
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
