const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    password: {
      type: String,
      required: true,
      select: false, // Protected by default
    },
    // Single identity can act as customer, vendor, admin, moderator, manager, finance, support
    roles: {
      type: [String],
      enum: ['customer', 'vendor', 'admin', 'moderator', 'manager', 'finance', 'support'],
      default: ['customer'],
    },
    isPhoneVerified: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    interests: {
      type: [String],
      default: [],
    },
    defaultLocation: {
      city: { type: String, default: '' },
      pincode: { type: String, default: '' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere',
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
