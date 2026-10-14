const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
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
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    isNegotiable: {
      type: Boolean,
      default: false,
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair'],
      default: 'good',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // 1-8 compressed images
    images: {
      type: [String],
      validate: [val => val.length <= 8, 'Max 8 images allowed'],
      default: [],
    },
    locality: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere', default: [0, 0] }, // [lng, lat]
    },
    contactPreference: {
      type: String,
      enum: ['call_only', 'enquiry_only', 'call_and_enquiry'],
      default: 'call_and_enquiry',
    },
    // Lifecycle: draft, pending_moderation, active, sold, paused, expired, removed
    status: {
      type: String,
      enum: ['draft', 'pending_moderation', 'active', 'sold', 'paused', 'expired', 'removed'],
      default: 'active', // or pending_moderation if strict
      index: true,
    },
    moderationReason: {
      type: String,
      default: '',
    },
    // Admin labels attached: 'New', '365 Recommended', 'Featured'
    labels: [
      {
        text: String,
        color: String,
        expiresAt: Date,
      },
    ],
    // Boosted status
    isBoosted: {
      type: Boolean,
      default: false,
      index: true,
    },
    boostExpiresAt: Date,
    viewsCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days life
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
