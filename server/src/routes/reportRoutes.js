const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const Listing = require('../models/Listing');
const VendorProfile = require('../models/VendorProfile');
const { protect, authorize } = require('../middlewares/auth');

// @desc    Submit abuse report for a listing, vendor, service or property
// @route   POST /api/reports
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { targetType, targetId, category, description } = req.body;

    if (!targetType || !targetId || !category || !description) {
      return res.status(400).json({ success: false, message: 'All report fields are required' });
    }

    const report = await Report.create({
      reporterUserId: req.user._id,
      targetType,
      targetId,
      category,
      description,
      status: 'pending',
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'ABUSE_REPORT_SUBMITTED',
      resourceType: 'Report',
      resourceId: report._id,
      details: { targetType, targetId, category },
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted. Our moderation team will investigate promptly.',
      reportId: report._id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Moderators review abuse report queue
// @route   GET /api/reports
// @access  Private (Admin, Moderator, Support)
router.get('/', protect, authorize('admin', 'moderator', 'support'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const reports = await Report.find(filter)
      .populate('reporterUserId', 'fullName phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Moderator takes action on report (content pause, removal, vendor suspend)
// @route   PUT /api/reports/:id/action
// @access  Private (Admin, Moderator)
router.put('/:id/action', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { status, actionTaken, reviewNotes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status || report.status;
    report.actionTaken = actionTaken || report.actionTaken;
    report.reviewNotes = reviewNotes || report.reviewNotes;
    report.reviewedByUserId = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    // Automatically enforce content pause or vendor suspension if specified
    if (actionTaken === 'content_paused' && report.targetType === 'listing') {
      await Listing.findByIdAndUpdate(report.targetId, { status: 'paused', moderationReason: reviewNotes });
    } else if (actionTaken === 'content_removed' && report.targetType === 'listing') {
      await Listing.findByIdAndUpdate(report.targetId, { status: 'removed', moderationReason: reviewNotes });
    } else if (actionTaken === 'vendor_suspended' && report.targetType === 'vendor') {
      await VendorProfile.findByIdAndUpdate(report.targetId, {
        status: 'suspended',
        verificationNotes: reviewNotes,
      });
    }

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'MODERATION_ACTION_ENFORCED',
      resourceType: 'Report',
      resourceId: report._id,
      details: { actionTaken, targetType: report.targetType, targetId: report.targetId },
    });

    return res.status(200).json({ success: true, message: 'Moderation action applied successfully', report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
