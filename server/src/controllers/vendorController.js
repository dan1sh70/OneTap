const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const VerificationCase = require('../models/VerificationCase');
const AuditLog = require('../models/AuditLog');
const { getVendorListingCapacity, checkVendorLeadAccess } = require('../services/entitlementService');

// @desc    Register or update Vendor Profile
// @route   POST /api/vendors/profile
// @access  Private
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const { businessName, businessPhone, businessEmail, description, address } = req.body;

    if (!businessName || !businessPhone) {
      return res.status(400).json({ success: false, message: 'Business name and business phone are required' });
    }

    let vendor = await VendorProfile.findOne({ userId: req.user._id });

    if (vendor) {
      // If business phone is changed, it requires re-verification per Section 03 & 12
      const phoneChanged = vendor.businessPhone !== businessPhone;
      vendor.businessName = businessName;
      vendor.businessPhone = businessPhone;
      if (phoneChanged) {
        vendor.isBusinessPhoneVerified = false;
      }
      vendor.businessEmail = businessEmail || vendor.businessEmail;
      vendor.description = description || vendor.description;
      if (address) vendor.address = address;

      await vendor.save();
    } else {
      vendor = await VendorProfile.create({
        userId: req.user._id,
        businessName,
        businessPhone,
        isBusinessPhoneVerified: true, // initial verified business number
        businessEmail,
        description,
        address,
      });

      // Add 'vendor' role to user if not already present
      if (!req.user.roles.includes('vendor')) {
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { roles: 'vendor' } });
      }
    }

    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Vendor's own dashboard metrics, entitlements & subscription status
// @route   GET /api/vendors/dashboard-summary
// @access  Private (Vendor)
exports.getVendorDashboardSummary = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const listingCapacity = await getVendorListingCapacity(vendor._id);
    const hasLeadAccess = await checkVendorLeadAccess(vendor._id);

    return res.status(200).json({
      success: true,
      vendor,
      entitlements: {
        listingCapacity,
        hasLeadAccess,
        promotionalCreditsPaise: vendor.promotionalCreditsPaise,
        badges: vendor.badges,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit verification case (Identity, Bank, Service Qualification, Property Authority)
// @route   POST /api/vendors/verification-case
// @access  Private (Vendor)
exports.submitVerification = async (req, res) => {
  try {
    const { verificationType, documents } = req.body;
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const vCase = await VerificationCase.create({
      vendorId: vendor._id,
      verificationType,
      documents: documents || [],
      status: 'submitted',
    });

    vendor.verificationStatus = 'submitted';
    await vendor.save();

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'VENDOR_VERIFICATION_SUBMITTED',
      resourceType: 'VerificationCase',
      resourceId: vCase._id,
    });

    return res.status(201).json({ success: true, message: 'Verification case submitted for staff review', case: vCase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public Vendor Profile (Viewable by customers free of charge)
// @route   GET /api/vendors/public/:id
// @access  Public
exports.getPublicVendorProfile = async (req, res) => {
  try {
    const vendor = await VendorProfile.findById(req.params.id).select(
      'businessName businessPhone businessEmail description address badges status createdAt'
    );

    if (!vendor || vendor.status === 'suspended') {
      return res.status(404).json({ success: false, message: 'Vendor not found or suspended' });
    }

    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
