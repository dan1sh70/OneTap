const express = require('express');
const router = express.Router();
const { getPlans, createVendorOrder, verifyAndActivate } = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/auth');

router.get('/plans', getPlans);
router.post('/create-order', protect, createVendorOrder);
router.post('/verify-and-activate', protect, verifyAndActivate);

module.exports = router;
