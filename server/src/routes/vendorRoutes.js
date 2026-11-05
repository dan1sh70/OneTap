const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile,
  getVendorDashboardSummary,
  submitVerification,
  getPublicVendorProfile,
} = require('../controllers/vendorController');
const { requestBenefit, getMyBenefitRequests } = require('../controllers/benefitRequestController');
const { protect } = require('../middlewares/auth');

router.post('/profile', protect, createOrUpdateProfile);
router.get('/dashboard-summary', protect, getVendorDashboardSummary);
router.post('/verification-case', protect, submitVerification);
router.get('/public/:id', getPublicVendorProfile);

// Benefit Requests
router.post('/benefit-requests', protect, requestBenefit);
router.get('/benefit-requests', protect, getMyBenefitRequests);

module.exports = router;
