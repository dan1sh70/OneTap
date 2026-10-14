const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    placementKey: {
      type: String,
      enum: [
        'HOME_HERO',
        'PRODUCT_FEED_SPONSORED',
        'PRODUCT_DETAIL_RELATED',
        'SERVICE_CATEGORY_BANNER',
        'PROPERTY_FEED_BANNER',
        'PROPERTY_DETAIL_BANNER',
        'PROPERTY_MANAGER_PROMO',
      ],
      required: true,
    },
    advertiserName: {
      type: String,
      required: true,
    },
    creativeUrl: {
      type: String,
      required: true,
    },
    ctaText: {
      type: String,
      default: 'Learn More',
    },
    destinationUrl: {
      type: String,
      required: true,
    },
    targetCity: {
      type: String,
      default: '', // blank means all
    },
    targetCategorySlug: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: Number,
      default: 1,
    },
    dailyDisplayCap: {
      type: Number,
      default: 10000,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'paused', 'expired', 'rejected'],
      default: 'active',
    },
    approverAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    impressionsCount: {
      type: Number,
      default: 0,
    },
    clicksCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
