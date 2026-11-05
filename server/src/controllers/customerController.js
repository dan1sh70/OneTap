const Favorite = require('../models/Favorite');
const Listing = require('../models/Listing');
const ServicePackage = require('../models/ServicePackage');
const PropertyListing = require('../models/PropertyListing');
const User = require('../models/User');

// @desc    Toggle favorite on a listing, service, or property
// @route   POST /api/customers/favorites/toggle
// @access  Private (Customer)
exports.toggleFavorite = async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, message: 'targetType and targetId are required' });
    }

    const existing = await Favorite.findOne({
      userId: req.user._id,
      targetType,
      targetId,
    });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      if (targetType === 'listing') {
        await Listing.findByIdAndUpdate(targetId, { $inc: { savesCount: -1 } });
      }
      return res.status(200).json({ success: true, isFavorite: false, message: 'Item removed from favorites' });
    } else {
      await Favorite.create({
        userId: req.user._id,
        targetType,
        targetId,
      });
      if (targetType === 'listing') {
        await Listing.findByIdAndUpdate(targetId, { $inc: { savesCount: 1 } });
      }
      return res.status(201).json({ success: true, isFavorite: true, message: 'Item saved to favorites' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all saved items for the logged-in customer
// @route   GET /api/customers/favorites
// @access  Private (Customer)
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const populated = await Promise.all(
      favorites.map(async (fav) => {
        let details = null;
        if (fav.targetType === 'listing') {
          details = await Listing.findById(fav.targetId).populate('vendorId', 'businessName businessPhone badges');
        } else if (fav.targetType === 'service') {
          details = await ServicePackage.findById(fav.targetId).populate('vendorId', 'businessName businessPhone badges');
        } else if (fav.targetType === 'property') {
          details = await PropertyListing.findById(fav.targetId).populate('vendorId', 'businessName businessPhone badges');
        }
        return {
          id: fav._id,
          targetType: fav.targetType,
          targetId: fav.targetId,
          savedAt: fav.createdAt,
          item: details,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: populated.length,
      data: populated.filter((f) => f.item !== null),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

