const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    planKey: {
      type: String,
      enum: ['BASIC', 'PREMIUM', 'PROPERTY_ASSIST'],
      required: true,
    },
    planVersion: {
      type: Number,
      required: true,
    },
    pricePaidPaise: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    productListingCap: {
      type: Number,
      required: true,
    },
    leadAccessUnlocked: {
      type: Boolean,
      default: true,
    },
    boostDaysRemaining: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
