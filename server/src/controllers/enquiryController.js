const Enquiry = require('../models/Enquiry');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');
const { checkVendorLeadAccess } = require('../services/entitlementService');

// @desc    Customer submits a free enquiry with explicit contact sharing consent (Flow 1 & Section 03)
// @route   POST /api/enquiries
// @access  Private (Customer sign-in required)
exports.submitEnquiry = async (req, res) => {
  try {
    const {
      vendorId,
      vertical,
      referenceId,
      structuredRequirements,
      coarseLocality,
      desiredTime,
      categoryName,
      budgetRange,
      message,
      exactAddress,
    } = req.body;

    if (!vendorId || !vertical || !referenceId || !structuredRequirements) {
      return res.status(400).json({
        success: false,
        message: 'Vendor, vertical, referenceId, and structured requirements are required',
      });
    }

    // Verify vendor exists
    const vendor = await VendorProfile.findById(vendorId);
    if (!vendor || vendor.status === 'suspended') {
      return res.status(404).json({ success: false, message: 'Vendor not found or suspended' });
    }

    const newEnquiry = await Enquiry.create({
      vendorId,
      customerId: req.user._id,
      vertical,
      referenceId,
      summary: {
        coarseLocality: coarseLocality || req.user.defaultLocation?.city || 'Local area',
        desiredTime: desiredTime || 'Flexible',
        categoryName: categoryName || '',
        budgetRange: budgetRange || '',
        structuredRequirements,
      },
      protectedDetails: {
        customerName: req.user.fullName || 'Customer',
        customerPhone: req.user.phone,
        customerEmail: req.user.email || '',
        message: message || '',
        exactAddress: exactAddress || '',
      },
      consentGiven: true,
      consentRevoked: false,
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'CUSTOMER_ENQUIRY_SUBMITTED',
      resourceType: 'Enquiry',
      resourceId: newEnquiry._id,
      details: { vendorId, vertical, referenceId },
    });

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted free of charge. Vendor will receive the notification.',
      enquiryId: newEnquiry._id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vendor views lead inbox (Strict server-side masking for free vendors / unlocks for subscribed vendors)
// @route   GET /api/enquiries/vendor-inbox
// @access  Private (Vendor)
exports.getVendorLeadInbox = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile not found' });
    }

    // Check server-side lead access entitlement
    const hasLeadAccess = await checkVendorLeadAccess(vendor._id);

    // Fetch leads addressed to THIS vendor only (Lead Access Boundary per PRD Section 01 & 03)
    const now = new Date();
    const leads = await Enquiry.find({
      vendorId: vendor._id,
      consentRevoked: false,
      expiresAt: { $gt: now }, // Within 90-day operational window
    }).sort({ createdAt: -1 });

    // Format safe response payloads - NEVER deliver protected fields if not subscribed!
    const sanitizedLeads = leads.map((lead) => {
      if (hasLeadAccess) {
        return {
          id: lead._id,
          vertical: lead.vertical,
          referenceId: lead.referenceId,
          summary: lead.summary,
          status: lead.status,
          createdAt: lead.createdAt,
          isUnlocked: true,
          // Consented customer contact details unlocked
          customerDetails: {
            name: lead.protectedDetails.customerName,
            phone: lead.protectedDetails.customerPhone,
            email: lead.protectedDetails.customerEmail,
            message: lead.protectedDetails.message,
            exactAddress: lead.protectedDetails.exactAddress,
          },
        };
      } else {
        // Free tier view: Mask name and phone completely on the server
        return {
          id: lead._id,
          vertical: lead.vertical,
          referenceId: lead.referenceId,
          summary: lead.summary,
          status: lead.status,
          createdAt: lead.createdAt,
          isUnlocked: false,
          unlockPrompt: 'Active subscription required to view customer phone and full details.',
          customerDetails: {
            name: 'Customer (Masked)',
            phone: '**********',
            email: '******@***.com',
            message: '',
          },
        };
      }
    });

    return res.status(200).json({
      success: true,
      count: sanitizedLeads.length,
      hasLeadAccess,
      leads: sanitizedLeads,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Customer withdraws consent or blocks vendor (PRD Section 03 & 12)
// @route   POST /api/enquiries/:id/revoke-consent
// @access  Private (Customer)
exports.revokeConsent = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (String(enquiry.customerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this enquiry' });
    }

    enquiry.consentRevoked = true;
    enquiry.status = 'closed';
    await enquiry.save();

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'CUSTOMER_REVOKED_LEAD_CONSENT',
      resourceType: 'Enquiry',
      resourceId: enquiry._id,
      details: { vendorId: enquiry.vendorId },
    });

    return res.status(200).json({ success: true, message: 'Lead consent successfully revoked' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
