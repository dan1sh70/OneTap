const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServicePackage',
      required: true,
    },
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
    desiredDate: {
      type: Date,
      required: true,
    },
    desiredTimeSlot: {
      type: String,
      required: true,
    },
    approximateArea: {
      type: String,
      required: true,
    },
    exactAddress: {
      type: String, // Shared only after provider acceptance & customer permission
      default: '',
    },
    consentToContact: {
      type: Boolean,
      default: true,
    },
    // Lifecycle: submitted -> proposed / accepted -> completed / cancelled / expired (24h timeout)
    status: {
      type: String,
      enum: ['submitted', 'proposed', 'accepted', 'completed', 'cancelled', 'expired'],
      default: 'submitted',
    },
    proposedAlternativeSlot: {
      date: Date,
      timeSlot: String,
      notes: String,
    },
    cancellationReason: String,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours provider response timeout
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
