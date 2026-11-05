const express = require('express');
const router = express.Router();
const {
  getPlans,
  createVendorOrder,
  verifyAndActivate,
  handleRazorpayWebhook,
} = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/auth');

router.get('/plans', getPlans);
router.post('/create-order', protect, createVendorOrder);
router.post('/verify-and-activate', protect, verifyAndActivate);
router.post('/webhook', handleRazorpayWebhook);

module.exports = router;
