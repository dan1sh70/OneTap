const BenefitRequest = require('../models/BenefitRequest');
const EntitlementGrant = require('../models/EntitlementGrant');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');

// @desc    Vendor submits an extra-benefit request (PRD Section 11 & 13)
// @route   POST /api/vendors/benefit-requests
// @access  Private (Vendor)
exports.requestBenefit = async (req, res) => {
  try {
    const { requestedByType, quantity, reason } = req.body;
    const vendor = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile not found' });
    }

    if (!requestedByType || !quantity || !reason) {
      return res.status(400).json({ success: false, message: 'Type, quantity, and reason are required' });
    }

    const request = await BenefitRequest.create({
      vendorId: vendor._id,
      requestedByType,
      quantity,
      reason,
      status: 'pending',
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'VENDOR_BENEFIT_REQUESTED',
      resourceType: 'BenefitRequest',
      resourceId: request._id,
      details: { requestedByType, quantity, reason },
    });

    return res.status(201).json({
      success: true,
      message: 'Benefit request submitted for Admin review.',
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vendor views their benefit requests history
// @route   GET /api/vendors/benefit-requests
// @access  Private (Vendor)
exports.getMyBenefitRequests = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile not found' });
    }

    const requests = await BenefitRequest.find({ vendorId: vendor._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

