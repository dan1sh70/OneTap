const express = require('express');
const router = express.Router();
const { submitEnquiry, getVendorLeadInbox, revokeConsent } = require('../controllers/enquiryController');
const { protect } = require('../middlewares/auth');

router.post('/', protect, submitEnquiry);
router.get('/vendor-inbox', protect, getVendorLeadInbox);
router.post('/:id/revoke-consent', protect, revokeConsent);

module.exports = router;
