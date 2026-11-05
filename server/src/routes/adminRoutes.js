const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  getUsers,
  toggleUserSuspension,
  getVerificationCases,
  reviewVerificationCase,
  getBenefitRequests,
  reviewBenefitRequest,
  createEntitlementGrant,
  getPropertyCases,
  assignPropertyManager,
  getFinancialLedger,
  getAuditLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

// Dashboard metrics
router.get('/metrics', protect, authorize('admin', 'moderator', 'finance', 'manager'), getAdminMetrics);

// Users
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id/suspension', protect, authorize('admin'), toggleUserSuspension);

// Verifications
router.get('/verifications', protect, authorize('admin', 'moderator'), getVerificationCases);
router.put('/verifications/:id', protect, authorize('admin', 'moderator'), reviewVerificationCase);

// Benefit Requests & Grants
router.get('/benefit-requests', protect, authorize('admin'), getBenefitRequests);
router.put('/benefit-requests/:id/review', protect, authorize('admin'), reviewBenefitRequest);
router.post('/entitlement-grants', protect, authorize('admin'), createEntitlementGrant);

// Property Cases
router.get('/property-cases', protect, authorize('admin', 'manager'), getPropertyCases);
router.put('/property-cases/:id/assign', protect, authorize('admin', 'manager'), assignPropertyManager);

// Finance & Audits
router.get('/financial-ledger', protect, authorize('admin', 'finance'), getFinancialLedger);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);

module.exports = router;
