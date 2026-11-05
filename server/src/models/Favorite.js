const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['listing', 'service', 'property'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// One favorite per user per item
favoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);

