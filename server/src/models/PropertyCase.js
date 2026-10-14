const mongoose = require('mongoose');

const propertyCaseSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    // Manager assigned by admin for vendor-funded assistance
    assignedManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    propertyListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PropertyListing',
    },
    // Customer requirements if customer initiated free assistance
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerRequirement: {
      transactionType: { type: String, enum: ['buy', 'sell', 'rent'] },
      locality: String,
      budgetPaise: Number,
      propertyType: String,
      timeline: String,
    },
    status: {
      type: String,
      enum: ['pending_assignment', 'assigned', 'shortlisting', 'visits_in_progress', 'negotiation', 'closed_external', 'cancelled'],
      default: 'pending_assignment',
    },
    notes: [
      {
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    visits: [
      {
        scheduledAt: Date,
        feedback: String,
        status: { type: String, enum: ['scheduled', 'completed', 'cancelled'] },
      },
    ],
    // Subscription validity: 30 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PropertyCase', propertyCaseSchema);
