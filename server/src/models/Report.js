const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['listing', 'vendor', 'service', 'property'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    category: {
      type: String,
      enum: ['fraud_or_scam', 'prohibited_item', 'harassment', 'misleading_pricing', 'counterfeit', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning_issued', 'content_paused', 'content_removed', 'vendor_suspended'],
      default: 'none',
    },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
