const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile,
  getVendorDashboardSummary,
  submitVerification,
  getPublicVendorProfile,
} = require('../controllers/vendorController');
const { protect } = require('../middlewares/auth');

router.post('/profile', protect, createOrUpdateProfile);
router.get('/dashboard-summary', protect, getVendorDashboardSummary);
router.post('/verification-case', protect, submitVerification);
router.get('/public/:id', getPublicVendorProfile);

module.exports = router;
