const express = require('express');
const router = express.Router();
const { verifyOtpAndLogin, loginPassword, getMe, updatePreferences } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/verify-otp-and-login', verifyOtpAndLogin);
router.post('/login-password', loginPassword);
router.get('/me', protect, getMe);
router.put('/preferences', protect, updatePreferences);

module.exports = router;
