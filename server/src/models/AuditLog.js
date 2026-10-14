const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    performedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true, // e.g., 'LEAD_ACCESS_ATTEMPT', 'LEAD_UNLOCKED', 'PLAN_GRANT', 'VENDOR_VERIFICATION_STATUS_CHANGED'
    },
    resourceType: {
      type: String,
      required: true, // e.g., 'Enquiry', 'VendorProfile', 'Listing'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'DENIED', 'FAILED'],
      default: 'SUCCESS',
    },
    ipAddress: String,
    userAgent: String,
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
