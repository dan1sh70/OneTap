const mongoose = require('mongoose');

const servicePackageSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    priceType: {
      type: String,
      enum: ['fixed', 'estimate'],
      default: 'estimate',
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    inclusions: [String],
    exclusions: [String],
    serviceableAreas: [String], // cities or localities
    workingHours: {
      from: { type: String, default: '09:00' },
      to: { type: String, default: '18:00' },
      days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    },
    images: [String],
    status: {
      type: String,
      enum: ['active', 'paused', 'removed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ServicePackage', servicePackageSchema);
