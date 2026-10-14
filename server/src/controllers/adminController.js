const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const VerificationCase = require('../models/VerificationCase');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const EntitlementGrant = require('../models/EntitlementGrant');
const PropertyCase = require('../models/PropertyCase');
const Payment = require('../models/Payment');
const LedgerEntry = require('../models/LedgerEntry');
const AuditLog = require('../models/AuditLog');

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
        totalRevenuePaise,
      },
    });
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

    // Update Vendor Profile status & specific badges per PRD Section 04
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

// @desc    Admin grants extra benefits/slots/boosts without silently editing base plan (PRD Section 11)
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
