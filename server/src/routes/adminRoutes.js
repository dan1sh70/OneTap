const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  reviewVerificationCase,
  createEntitlementGrant,
  assignPropertyManager,
  getAuditLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/metrics', protect, authorize('admin', 'moderator', 'finance', 'manager'), getAdminMetrics);
router.put('/verifications/:id', protect, authorize('admin', 'moderator'), reviewVerificationCase);
router.post('/entitlement-grants', protect, authorize('admin'), createEntitlementGrant);
router.put('/property-cases/:id/assign', protect, authorize('admin', 'manager'), assignPropertyManager);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);

module.exports = router;
