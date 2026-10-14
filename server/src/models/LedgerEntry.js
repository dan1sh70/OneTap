const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['credit_grant', 'credit_spend', 'subscription_purchase', 'boost_purchase', 'refund'],
      required: true,
    },
    // Stored strictly in integer paise
    amountPaise: {
      type: Number,
      required: true,
    },
    balanceAfterPaise: {
      type: Number,
      required: true,
    },
    sourcePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    description: {
      type: String,
      required: true,
    },
    performedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
