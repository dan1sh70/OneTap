const mongoose = require('mongoose');

const propertyListingSchema = new mongoose.Schema(
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
    transactionType: {
      type: String,
      enum: ['buy', 'sell', 'rent'],
      required: true,
    },
    propertyType: {
      type: String,
      enum: ['apartment', 'villa', 'plot', 'commercial', 'office'],
      required: true,
    },
    userType: {
      type: String,
      enum: ['owner', 'broker', 'builder'],
      default: 'owner',
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    carpetAreaSqFt: Number,
    bedrooms: Number,
    bathrooms: Number,
    locality: { type: String, required: true },
    city: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere', default: [0, 0] },
    },
    description: String,
    images: [String],
    reraRegistered: { type: Boolean, default: false },
    reraNumber: String,
    status: {
      type: String,
      enum: ['active', 'paused', 'closed', 'removed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PropertyListing', propertyListingSchema);
