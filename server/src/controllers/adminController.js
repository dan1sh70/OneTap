const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const VerificationCase = require('../models/VerificationCase');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const EntitlementGrant = require('../models/EntitlementGrant');
const BenefitRequest = require('../models/BenefitRequest');
const PropertyCase = require('../models/PropertyCase');
const Payment = require('../models/Payment');
const LedgerEntry = require('../models/LedgerEntry');
const AuditLog = require('../models/AuditLog');
const Report = require('../models/Report');

// @desc    Admin summary metrics for operational dashboard
// @route   GET /api/admin/metrics
// @access  Private (Admin, Moderator, Finance, Manager)
exports.getAdminMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVendors = await VendorProfile.countDocuments();
    const pendingVerifications = await VerificationCase.countDocuments({ status: 'submitted' });
    const activeListings = await Listing.countDocuments({ status: 'active' });
    const pendingPropertyCases = await PropertyCase.countDocuments({ status: 'pending_assignment' });
    const pendingBenefitRequests = await BenefitRequest.countDocuments({ status: 'pending' });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // Revenue calculation from completed vendor payments
    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, totalRevenuePaise: { $sum: '$amountPaise' } } },
    ]);

    const totalRevenuePaise = revenueAgg[0]?.totalRevenuePaise || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        pendingVerifications,
        activeListings,
        pendingPropertyCases,
        pendingBenefitRequests,
        pendingReports,
        totalRevenuePaise,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users with role filtering & pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.roles = role;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle user suspension
// @route   PUT /api/admin/users/:id/suspension
// @access  Private (Admin)
exports.toggleUserSuspension = async (req, res) => {
  try {
    const { isSuspended, suspensionReason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isSuspended = isSuspended;
    user.suspensionReason = suspensionReason || '';
    await user.save();

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: isSuspended ? 'USER_SUSPENDED' : 'USER_REINSTATED',
      resourceType: 'User',
      resourceId: user._id,
      details: { suspensionReason },
    });

    return res.status(200).json({ success: true, message: 'User status updated', user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all verification cases
// @route   GET /api/admin/verifications
// @access  Private (Admin, Moderator)
exports.getVerificationCases = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const cases = await VerificationCase.find(filter)
      .populate('vendorId')
      .populate('reviewerId', 'fullName phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Review and update vendor verification case (Identity, Bank, Service, Property)
// @route   PUT /api/admin/verifications/:id
// @access  Private (Admin, Moderator)
exports.reviewVerificationCase = async (req, res) => {
  try {
    const { status, reviewNotes, badgesToGrant } = req.body;
    const vCase = await VerificationCase.findById(req.params.id);
    if (!vCase) {
      return res.status(404).json({ success: false, message: 'Verification case not found' });
    }

    vCase.status = status;
    vCase.reviewNotes = reviewNotes || '';
    vCase.reviewerId = req.user._id;
    vCase.reviewedAt = new Date();
    await vCase.save();

    const vendor = await VendorProfile.findById(vCase.vendorId);
    if (vendor) {
      if (status === 'approved') {
        vendor.verificationStatus = 'approved';
        if (badgesToGrant) {
          if (badgesToGrant.isIdentityVerified !== undefined)
            vendor.badges.isIdentityVerified = badgesToGrant.isIdentityVerified;
          if (badgesToGrant.isBankVerified !== undefined)
            vendor.badges.isBankVerified = badgesToGrant.isBankVerified;
          if (badgesToGrant.isServiceQualified !== undefined)
            vendor.badges.isServiceQualified = badgesToGrant.isServiceQualified;
          if (badgesToGrant.isPropertyAuthorized !== undefined)
            vendor.badges.isPropertyAuthorized = badgesToGrant.isPropertyAuthorized;
        }
      } else if (status === 'changes_requested') {
        vendor.verificationStatus = 'changes_requested';
      } else if (status === 'rejected') {
        vendor.verificationStatus = 'rejected';
      }
      vendor.verificationNotes = reviewNotes || vendor.verificationNotes;
      await vendor.save();
    }

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'ADMIN_REVIEWED_VERIFICATION',
      resourceType: 'VerificationCase',
      resourceId: vCase._id,
      details: { newStatus: status, vendorId: vCase.vendorId },
    });

    return res.status(200).json({ success: true, message: 'Verification case updated', case: vCase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin lists benefit requests from vendors
// @route   GET /api/admin/benefit-requests
// @access  Private (Admin)
exports.getBenefitRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const requests = await BenefitRequest.find(filter)
      .populate('vendorId')
      .populate('reviewedByAdminId', 'fullName phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin reviews/approves/rejects benefit request and generates audited grant
// @route   PUT /api/admin/benefit-requests/:id/review
// @access  Private (Admin)
exports.reviewBenefitRequest = async (req, res) => {
  try {
    const { status, reviewNotes, durationDays = 30 } = req.body;
    const bRequest = await BenefitRequest.findById(req.params.id);
    if (!bRequest) {
      return res.status(404).json({ success: false, message: 'Benefit request not found' });
    }

    bRequest.status = status;
    bRequest.reviewNotes = reviewNotes || '';
    bRequest.reviewedByAdminId = req.user._id;
    bRequest.reviewedAt = new Date();

    if (status === 'approved') {
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      const grant = await EntitlementGrant.create({
        vendorId: bRequest.vendorId,
        grantType: bRequest.requestedByType,
        quantity: bRequest.quantity,
        reason: `Approved request: ${bRequest.reason}`,
        grantedByAdminId: req.user._id,
        expiresAt,
        status: 'active',
      });
      bRequest.resultingGrantId = grant._id;

      await AuditLog.create({
        performedByUserId: req.user._id,
        action: 'ADMIN_ENTITLEMENT_GRANTED',
        resourceType: 'EntitlementGrant',
        resourceId: grant._id,
        details: { vendorId: bRequest.vendorId, grantType: bRequest.requestedByType, quantity: bRequest.quantity },
      });
    }

    await bRequest.save();
    return res.status(200).json({ success: true, message: `Request marked as ${status}`, bRequest });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin grants extra benefits directly
// @route   POST /api/admin/entitlement-grants
// @access  Private (Admin only)
exports.createEntitlementGrant = async (req, res) => {
  try {
    const { vendorId, grantType, quantity, reason, durationDays = 30 } = req.body;

    if (!vendorId || !grantType || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: 'vendorId, grantType, quantity, and reason are required for audited grant',
      });
    }

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const grant = await EntitlementGrant.create({
      vendorId,
      grantType,
      quantity,
      reason,
      grantedByAdminId: req.user._id,
      expiresAt,
      status: 'active',
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'ADMIN_ENTITLEMENT_GRANTED',
      resourceType: 'EntitlementGrant',
      resourceId: grant._id,
      details: { vendorId, grantType, quantity, reason, expiresAt },
    });

    return res.status(201).json({ success: true, message: 'Extra benefit grant recorded with audit', grant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List property cases
// @route   GET /api/admin/property-cases
// @access  Private (Admin, Manager)
exports.getPropertyCases = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const cases = await PropertyCase.find(filter)
      .populate('assignedManagerId', 'fullName phone')
      .populate('customerId', 'fullName phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign manager to a property case
// @route   PUT /api/admin/property-cases/:id/assign
// @access  Private (Admin, Manager)
exports.assignPropertyManager = async (req, res) => {
  try {
    const { managerId } = req.body;
    const propertyCase = await PropertyCase.findById(req.params.id);
    if (!propertyCase) {
      return res.status(404).json({ success: false, message: 'Property case not found' });
    }

    propertyCase.assignedManagerId = managerId || req.user._id;
    propertyCase.status = 'assigned';
    await propertyCase.save();

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'PROPERTY_MANAGER_ASSIGNED',
      resourceType: 'PropertyCase',
      resourceId: propertyCase._id,
      details: { assignedManagerId: propertyCase.assignedManagerId },
    });

    return res.status(200).json({ success: true, message: 'Manager assigned to property case', propertyCase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Financial Ledger entries (paise)
// @route   GET /api/admin/financial-ledger
// @access  Private (Admin, Finance)
exports.getFinancialLedger = async (req, res) => {
  try {
    const ledger = await LedgerEntry.find()
      .populate('vendorId', 'businessName businessPhone')
      .populate('performedByAdminId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ success: true, count: ledger.length, data: ledger });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Fetch system audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedByUserId', 'phone fullName roles')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
