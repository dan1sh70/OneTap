const express = require('express');
const router = express.Router();
const {
  getServicePackages,
  createServicePackage,
  submitServiceRequest,
  getVendorServiceRequests,
  respondToServiceRequest,
} = require('../controllers/serviceController');
const { protect } = require('../middlewares/auth');

router.get('/packages', getServicePackages);
router.post('/packages', protect, createServicePackage);
router.post('/requests', protect, submitServiceRequest);
router.get('/vendor-requests', protect, getVendorServiceRequests);
router.put('/requests/:id/respond', protect, respondToServiceRequest);

module.exports = router;
