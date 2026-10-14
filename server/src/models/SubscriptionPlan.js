const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    planKey: {
      type: String,
      enum: ['BASIC', 'PREMIUM', 'PROPERTY_ASSIST'],
      required: true,
      unique: true,
    },
    version: {
      type: Number,
      default: 1, // plan versioning so price edits never alter existing contracts
    },
    title: {
      type: String,
      required: true,
    },
    pricePaise: {
      type: Number,
      required: true, // Integer paise (e.g. 99900 = 999 INR)
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    productListingCap: {
      type: Number,
      default: 10,
    },
    leadAccessUnlocked: {
      type: Boolean,
      default: true,
    },
    boostDaysAllowance: {
      type: Number,
      default: 0,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
