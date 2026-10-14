const Listing = require('../models/Listing');
const VendorProfile = require('../models/VendorProfile');
const { getVendorListingCapacity } = require('../services/entitlementService');
const AuditLog = require('../models/AuditLog');

// @desc    Browse products with geo/city filtering, radius, category, interest and deterministic scoring
// @route   GET /api/listings
// @access  Public (Always free for customers)
exports.getListings = async (req, res) => {
  try {
    const {
      city,
      categoryId,
      condition,
      minPrice,
      maxPrice,
      lng,
      lat,
      radiusKm = 10,
      keyword,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { status: 'active' };

    if (city) filter.city = new RegExp(`^${city}$`, 'i');
    if (categoryId) filter.categoryId = categoryId;
    if (condition) filter.condition = condition;
    if (minPrice || maxPrice) {
      filter.pricePaise = {};
      if (minPrice) filter.pricePaise.$gte = Number(minPrice);
      if (maxPrice) filter.pricePaise.$lte = Number(maxPrice);
    }
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { locality: { $regex: keyword, $options: 'i' } },
      ];
    }

    // Geospatial search if coordinates provided
    if (lng && lat) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseFloat(radiusKm) * 1000,
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Populate vendor public profile so vendor business phone is directly visible free of charge
    const listings = await Listing.find(filter)
      .populate('vendorId', 'businessName businessPhone businessEmail badges status isBusinessPhoneVerified')
      .populate('categoryId', 'name slug')
      .sort({ isBoosted: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: listings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product details with public vendor phone
// @route   GET /api/listings/:id
// @access  Public (Always free)
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('vendorId', 'businessName businessPhone businessEmail description badges address status')
      .populate('categoryId', 'name slug');

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Increment views atomically
    await Listing.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });

    return res.status(200).json({
      success: true,
      listing,
      // Clear explanation per PRD: call button is free, vendor public number is visible
      accessNotice: 'Customers can call vendor directly or submit a free structured enquiry.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create product listing with strict server-side quota enforcement
// @route   POST /api/listings
// @access  Private (Vendor)
exports.createListing = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile required to create listings' });
    }

    // Atomic server-side capacity check
    const capacity = await getVendorListingCapacity(vendor._id);
    if (!capacity.hasAvailableSlot) {
      return res.status(403).json({
        success: false,
        message: `Listing limit reached (${capacity.currentActiveCount}/${capacity.totalCap}). Please upgrade to a paid plan or request an admin grant to add more listings.`,
        capacity,
      });
    }

    const {
      title,
      categoryId,
      subcategoryId,
      pricePaise,
      isNegotiable,
      condition,
      description,
      images,
      locality,
      city,
      coordinates,
      contactPreference,
    } = req.body;

    const newListing = await Listing.create({
      vendorId: vendor._id,
      title,
      categoryId,
      subcategoryId,
      pricePaise,
      isNegotiable,
      condition,
      description,
      images: images || [],
      locality,
      city,
      location: {
        type: 'Point',
        coordinates: coordinates || [0, 0],
      },
      contactPreference: contactPreference || 'call_and_enquiry',
      status: 'active', // or pending_moderation if flagged
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'LISTING_CREATED',
      resourceType: 'Listing',
      resourceId: newListing._id,
      details: { title, pricePaise, remainingSlots: capacity.totalCap - capacity.currentActiveCount - 1 },
    });

    return res.status(201).json({
      success: true,
      message: 'Product listed successfully',
      listing: newListing,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update listing details or status (sold/paused/active)
// @route   PUT /api/listings/:id
// @access  Private (Vendor)
exports.updateListing = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (String(listing.vendorId) !== String(vendor._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this listing' });
    }

    // If reactivating a paused listing, check capacity again
    if (req.body.status === 'active' && listing.status !== 'active') {
      const capacity = await getVendorListingCapacity(vendor._id);
      if (!capacity.hasAvailableSlot) {
        return res.status(403).json({
          success: false,
          message: 'Cannot activate listing: active capacity limit reached. Upgrade plan to unlock.',
        });
      }
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ success: true, listing: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
