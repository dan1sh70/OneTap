const ServicePackage = require('../models/ServicePackage');
const ServiceRequest = require('../models/ServiceRequest');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');
const { checkVendorLeadAccess } = require('../services/entitlementService');

// @desc    List all service offerings with filters and public vendor details
// @route   GET /api/services/packages
// @access  Public
exports.getServicePackages = async (req, res) => {
  try {
    const { categoryId, city, search } = req.query;
    const filter = { status: 'active' };

    if (categoryId) filter.categoryId = categoryId;
    if (city) filter.serviceableAreas = new RegExp(city, 'i');
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const packages = await ServicePackage.find(filter)
      .populate('vendorId', 'businessName businessPhone businessEmail badges status')
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: packages.length, data: packages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vendor creates a service offering package
// @route   POST /api/services/packages
// @access  Private (Vendor)
exports.createServicePackage = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile required' });
    }

    const {
      title,
      categoryId,
      priceType,
      pricePaise,
      description,
      inclusions,
      exclusions,
      serviceableAreas,
      workingHours,
    } = req.body;

    const packageDoc = await ServicePackage.create({
      vendorId: vendor._id,
      title,
      categoryId,
      priceType: priceType || 'estimate',
      pricePaise,
      description,
      inclusions: inclusions || [],
      exclusions: exclusions || [],
      serviceableAreas: serviceableAreas || [],
      workingHours,
    });

    return res.status(201).json({ success: true, data: packageDoc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Customer submits a free service request (No platform fee, direct vendor booking)
// @route   POST /api/services/requests
// @access  Private (Customer)
exports.submitServiceRequest = async (req, res) => {
  try {
    const { packageId, desiredDate, desiredTimeSlot, approximateArea, exactAddress } = req.body;

    const packageDoc = await ServicePackage.findById(packageId);
    if (!packageDoc) {
      return res.status(404).json({ success: false, message: 'Service package not found' });
    }

    const newRequest = await ServiceRequest.create({
      packageId,
      vendorId: packageDoc.vendorId,
      customerId: req.user._id,
      desiredDate,
      desiredTimeSlot,
      approximateArea,
      exactAddress: exactAddress || '',
      consentToContact: true,
      status: 'submitted',
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'SERVICE_REQUEST_SUBMITTED',
      resourceType: 'ServiceRequest',
      resourceId: newRequest._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Service request submitted free of charge. Vendor will review your timing.',
      data: newRequest,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vendor reviews incoming service requests (Masked if free vendor, unmasked if subscribed)
// @route   GET /api/services/vendor-requests
// @access  Private (Vendor)
exports.getVendorServiceRequests = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile not found' });
    }

    const hasLeadAccess = await checkVendorLeadAccess(vendor._id);
    const requests = await ServiceRequest.find({ vendorId: vendor._id })
      .populate('packageId', 'title priceType pricePaise')
      .populate('customerId', 'fullName phone email')
      .sort({ createdAt: -1 });

    const formatted = requests.map((item) => {
      if (hasLeadAccess) {
        return {
          id: item._id,
          package: item.packageId,
          desiredDate: item.desiredDate,
          desiredTimeSlot: item.desiredTimeSlot,
          approximateArea: item.approximateArea,
          exactAddress: item.exactAddress,
          status: item.status,
          createdAt: item.createdAt,
          isUnlocked: true,
          customer: {
            name: item.customerId.fullName,
            phone: item.customerId.phone,
            email: item.customerId.email,
          },
        };
      } else {
        return {
          id: item._id,
          package: item.packageId,
          desiredDate: item.desiredDate,
          desiredTimeSlot: item.desiredTimeSlot,
          approximateArea: item.approximateArea,
          status: item.status,
          createdAt: item.createdAt,
          isUnlocked: false,
          unlockPrompt: 'Active subscription required to view customer phone and address.',
          customer: {
            name: 'Customer (Masked)',
            phone: '**********',
          },
        };
      }
    });

    return res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vendor accepts, declines, or proposes alternative time
// @route   PUT /api/services/requests/:id/respond
// @access  Private (Vendor)
exports.respondToServiceRequest = async (req, res) => {
  try {
    const { status, proposedDate, proposedTimeSlot, notes, cancellationReason } = req.body;
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    const requestDoc = await ServiceRequest.findById(req.params.id);

    if (!requestDoc || String(requestDoc.vendorId) !== String(vendor._id)) {
      return res.status(404).json({ success: false, message: 'Request not found or unauthorized' });
    }

    if (status === 'proposed') {
      requestDoc.status = 'proposed';
      requestDoc.proposedAlternativeSlot = { date: proposedDate, timeSlot: proposedTimeSlot, notes };
    } else if (status === 'accepted') {
      requestDoc.status = 'accepted';
    } else if (status === 'cancelled') {
      requestDoc.status = 'cancelled';
      requestDoc.cancellationReason = cancellationReason || 'Provider unavailable';
    } else if (status === 'completed') {
      requestDoc.status = 'completed';
    }

    await requestDoc.save();
    return res.status(200).json({ success: true, message: `Request status updated to ${status}`, data: requestDoc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
