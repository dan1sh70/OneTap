const mongoose = require('mongoose');

const verificationCaseSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    verificationType: {
      type: String,
      enum: ['identity', 'bank', 'service_qualification', 'property_authority'],
      required: true,
    },
    // Document metadata (Never store sensitive identity documents in public buckets)
    documents: [
      {
        docType: { type: String, required: true },
        filePath: { type: String, required: true }, // secure private path
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'changes_requested', 'rejected'],
      default: 'submitted',
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationCase', verificationCaseSchema);
