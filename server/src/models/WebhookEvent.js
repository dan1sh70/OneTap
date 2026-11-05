const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['razorpay'],
      default: 'razorpay',
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processingNotes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);

