const PropertyListing = require('../models/PropertyListing');
const PropertyCase = require('../models/PropertyCase');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');

// @desc    Browse real estate properties with filters
// @route   GET /api/properties
// @access  Public (Always free)
exports.getProperties = async (req, res) => {
  try {
    const { transactionType, propertyType, city, minPrice, maxPrice } = req.query;
    const filter = { status: 'active' };

    if (transactionType) filter.transactionType = transactionType;
    if (propertyType) filter.propertyType = propertyType;
    if (city) filter.city = new RegExp(`^${city}$`, 'i');
    if (minPrice || maxPrice) {
      filter.pricePaise = {};
      if (minPrice) filter.pricePaise.$gte = Number(minPrice);
      if (maxPrice) filter.pricePaise.$lte = Number(maxPrice);
    }

    const properties = await PropertyListing.find(filter)
      .populate('vendorId', 'businessName businessPhone businessEmail badges status')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: properties.length, data: properties });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List property on the platform (Owner/Broker acts as vendor)
// @route   POST /api/properties
// @access  Private (Vendor/Owner)
exports.createPropertyListing = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile required to list property' });
    }

    const {
      title,
      transactionType,
      propertyType,
      userType,
      pricePaise,
      carpetAreaSqFt,
      bedrooms,
      bathrooms,
      locality,
      city,
      description,
      images,
      reraRegistered,
      reraNumber,
    } = req.body;

    const property = await PropertyListing.create({
      vendorId: vendor._id,
      title,
      transactionType,
      propertyType,
      userType: userType || 'owner',
      pricePaise,
      carpetAreaSqFt,
      bedrooms,
      bathrooms,
      locality,
      city,
      description,
      images: images || [],
      reraRegistered: Boolean(reraRegistered),
      reraNumber,
    });

    return res.status(201).json({ success: true, data: property });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Customer submits free property requirements (PRD Section 08 & Flow 4)
// @route   POST /api/properties/customer-requirement
// @access  Private (Customer - 100% Free, no checkout)
exports.submitCustomerRequirement = async (req, res) => {
  try {
    const { transactionType, locality, budgetPaise, propertyType, timeline } = req.body;

    // Route to manager pool for assignment
    const propertyCase = await PropertyCase.create({
      vendorId: req.user._id, // placeholder for unassigned vendor
      customerId: req.user._id,
      customerRequirement: {
        transactionType,
        locality,
        budgetPaise,
        propertyType,
        timeline,
      },
      status: 'pending_assignment',
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'CUSTOMER_PROPERTY_ASSISTANCE_REQUESTED',
      resourceType: 'PropertyCase',
      resourceId: propertyCase._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Property requirement submitted free of charge. A dedicated property manager will contact you.',
      caseId: propertyCase._id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
