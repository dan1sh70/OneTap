const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { uploadPublic, uploadPrivate } = require('../middlewares/upload');
const { protect, authorize } = require('../middlewares/auth');

// @desc    Upload up to 8 public images for listings or service packages
// @route   POST /api/upload/images
// @access  Private (Vendor / User)
router.post('/images', protect, uploadPublic.array('images', 8), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files uploaded' });
    }

    const fileUrls = req.files.map((file) => `/uploads/public/${file.filename}`);
    return res.status(200).json({
      success: true,
      message: `${req.files.length} image(s) uploaded successfully`,
      urls: fileUrls,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Upload private document for verification/KYC (Stored privately)
// @route   POST /api/upload/private-document
// @access  Private (Vendor)
router.post('/private-document', protect, uploadPrivate.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document file uploaded' });
    }

    // Return private internal reference ID / filename (NOT a public URL)
    return res.status(200).json({
      success: true,
      message: 'Verification document uploaded safely into private storage',
      docPath: req.file.filename,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Authorized staff views private KYC document securely (PRD Section 04)
// @route   GET /api/upload/private-document/:filename
// @access  Private (Admin / Moderator only)
router.get('/private-document/:filename', protect, authorize('admin', 'moderator'), (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, '../../uploads/private', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Private document not found' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
