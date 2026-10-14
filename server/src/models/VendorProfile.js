const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    // Verified public business contact number (visible to all customers free)
    businessPhone: {
      type: String,
      required: true,
      trim: true,
    },
    isBusinessPhoneVerified: {
      type: Boolean,
      default: false,
    },
    businessEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: String,
      locality: String,
      city: { type: String, required: true },
      state: String,
      pincode: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere', default: [0, 0] }, // [lng, lat]
      },
    },
    // Verification Status: not_submitted, submitted, under_review, approved, changes_requested, rejected
    verificationStatus: {
      type: String,
      enum: ['not_submitted', 'submitted', 'under_review', 'approved', 'changes_requested', 'rejected'],
      default: 'not_submitted',
    },
    verificationNotes: {
      type: String,
      default: '',
    },
    // Separate verified badges as mandated by PRD
    badges: {
      isIdentityVerified: { type: Boolean, default: false },
      isBankVerified: { type: Boolean, default: false },
      isServiceQualified: { type: Boolean, default: false },
      isPropertyAuthorized: { type: Boolean, default: false },
      is365Recommended: { type: Boolean, default: false },
    },
    activeSubscriptions: [
      {
        planType: { type: String, enum: ['BASIC', 'PREMIUM', 'PROPERTY_ASSIST'] },
        subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
        expiresAt: Date,
      },
    ],
    // Non-withdrawable promotional credit balance (integer paise)
    promotionalCreditsPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'suspended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
