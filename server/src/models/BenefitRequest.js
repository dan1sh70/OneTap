const mongoose = require('mongoose');

const benefitRequestSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    requestedByType: {
      type: String,
      enum: ['extra_listing_slots', 'boost_days', 'duration_extension'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    resultingGrantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EntitlementGrant',
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('BenefitRequest', benefitRequestSchema);

