const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vertical: {
      type: String,
      enum: ['product', 'service', 'property'],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // points to Listing, ServicePackage, or PropertyListing
    },
    // Safe structured fields visible in free masked preview
    summary: {
      coarseLocality: { type: String, required: true },
      desiredTime: { type: String, default: 'Flexible' },
      categoryName: { type: String, default: '' },
      budgetRange: { type: String, default: '' },
      structuredRequirements: { type: String, required: true },
    },
    // Protected lead details - unlocked ONLY when vendor has an active paid subscription
    protectedDetails: {
      customerName: { type: String, required: true },
      customerPhone: { type: String, required: true },
      customerEmail: { type: String, default: '' },
      message: { type: String, default: '' },
      exactAddress: { type: String, default: '' },
    },
    // Explicit customer consent
    consentGiven: {
      type: Boolean,
      default: true,
    },
    consentRevoked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['submitted', 'viewed', 'contacted', 'closed', 'reported'],
      default: 'submitted',
    },
    // Lead access audit trail
    unlockedByVendors: [
      {
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile' },
        unlockedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90-day operational lead window
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
