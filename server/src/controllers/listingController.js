const Listing = require('../models/Listing');
const Campaign = require('../models/Campaign');
const VendorProfile = require('../models/VendorProfile');
const { getVendorListingCapacity } = require('../services/entitlementService');
const AuditLog = require('../models/AuditLog');

/**
 * Calculates deterministic organic ranking score (PRD Section 06 & 14)
 * Formula:
 * 40% Category / Interest Match
 * 35% Distance proximity
 * 15% Recency (listing age)
 * 10% Listing completeness (images, detailed description)
 */
const calculateDeterministicScore = (listing, { userInterests = [], userLng, userLat, maxDistanceMeters = 50000 }) => {
  // 1. Category / Interest Match (0 to 40 pts)
  let interestScore = 0;
  if (userInterests && userInterests.length > 0 && listing.categoryId) {
    const catName = listing.categoryId.name ? listing.categoryId.name.toLowerCase() : '';
    const catSlug = listing.categoryId.slug ? listing.categoryId.slug.toLowerCase() : '';
    const matches = userInterests.some(
      (interest) => catName.includes(interest.toLowerCase()) || catSlug.includes(interest.toLowerCase())
    );
    if (matches) interestScore = 40;
  }

  // 2. Distance Score (0 to 35 pts)
  let distanceScore = 35; // Default max if user location not specified
  if (userLng !== undefined && userLat !== undefined && listing.location && listing.location.coordinates) {
    const [lLng, lLat] = listing.location.coordinates;
    const distanceMeters = getDistanceFromLatLonInMeters(userLat, userLng, lLat, lLng);
    const normalizedDistance = Math.min(distanceMeters / maxDistanceMeters, 1);
    distanceScore = Math.max(0, 35 * (1 - normalizedDistance));
  }

  // 3. Recency Score (0 to 15 pts) - 30 days decay window
  const ageMs = Date.now() - new Date(listing.createdAt).getTime();
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
  const normalizedAge = Math.min(ageMs / maxAgeMs, 1);
  const recencyScore = Math.max(0, 15 * (1 - normalizedAge));

  // 4. Listing Completeness (0 to 10 pts)
  let completenessScore = 0;
  if (listing.images && listing.images.length > 0) {
    completenessScore += Math.min(listing.images.length * 1.5, 6); // Up to 6 pts for images
  }
  if (listing.description && listing.description.length > 50) {
    completenessScore += 4; // 4 pts for rich description
  }

  return interestScore + distanceScore + recencyScore + completenessScore;
};

// Haversine formula
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// @desc    Browse products with geo/city filtering, deterministic scoring, and sponsored interleaving
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

    // User location coordinates if provided
    let userLng = lng ? parseFloat(lng) : undefined;
    let userLat = lat ? parseFloat(lat) : undefined;

    if (userLng !== undefined && userLat !== undefined) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat],
          },
          $maxDistance: parseFloat(radiusKm) * 1000,
        },
      };
    }

    // Fetch active listings
    const rawListings = await Listing.find(filter)
      .populate('vendorId', 'businessName businessPhone businessEmail badges status isBusinessPhoneVerified')
      .populate('categoryId', 'name slug')
      .limit(100); // Pool for deterministic ranking

    // Filter out suspended vendors
    const eligibleListings = rawListings.filter(
      (item) => item.vendorId && item.vendorId.status !== 'suspended'
    );

    const userInterests = req.user ? req.user.interests : [];

    // Calculate organic score for each listing
    const scoredListings = eligibleListings.map((item) => {
      const score = calculateDeterministicScore(item, {
        userInterests,
        userLng,
        userLat,
        maxDistanceMeters: parseFloat(radiusKm) * 1000,
      });
      return {
        ...item.toObject(),
        rankingScore: Math.round(score * 10) / 10,
      };
    });

    // Sort by Boosted status first, then by Deterministic score descending
    scoredListings.sort((a, b) => {
      if (b.isBoosted !== a.isBoosted) {
        return b.isBoosted ? 1 : -1;
      }
      return b.rankingScore - a.rankingScore;
    });

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedOrganic = scoredListings.slice(skip, skip + parseInt(limit));

    // Sponsored ad interleaving (PRD Section 06 & 09: 1 sponsored per 8 organic items, max 2 near top)
    const now = new Date();
    const activeAds = await Campaign.find({
      placementKey: 'PRODUCT_FEED_SPONSORED',
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ priority: -1 })
      .limit(2);

    const feedWithAds = [];
    let adIndex = 0;

    paginatedOrganic.forEach((item, index) => {
      // Inject sponsored banner at position 2 and position 10
      if ((index === 2 || index === 10) && adIndex < activeAds.length) {
        feedWithAds.push({
          isSponsoredPlacement: true,
          sponsoredCampaign: activeAds[adIndex],
        });
        adIndex++;
      }
      feedWithAds.push({
        isSponsoredPlacement: false,
        listing: item,
      });
    });

    return res.status(200).json({
      success: true,
      count: paginatedOrganic.length,
      total: scoredListings.length,
      page: parseInt(page),
      pages: Math.ceil(scoredListings.length / parseInt(limit)),
      feed: feedWithAds,
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

    await Listing.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });

    return res.status(200).json({
      success: true,
      listing,
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
      status: 'active',
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

// @desc    Update listing details or status
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
