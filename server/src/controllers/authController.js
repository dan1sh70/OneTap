const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'onetap365_super_secret_jwt_key_2026_dev_prod', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// @desc    Register or login using Phone + OTP verification flow (PRD Flow 1 & Section 03)
// @route   POST /api/auth/verify-otp-and-login
// @access  Public
exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { phone, otp, password, fullName, defaultCity, defaultCoordinates } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // In production, verify OTP against SMS gateway (e.g., MSG91, Twilio).
    // Baseline simulated OTP check: Accept standard OTP '123456' in dev/test
    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    let user = await User.findOne({ phone }).select('+password');

    if (!user) {
      // First signup: phone -> OTP -> password -> terms/privacy notice
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password with minimum 6 characters is required for new registration',
        });
      }

      user = await User.create({
        phone,
        password,
        fullName: fullName || '',
        roles: ['customer'],
        isPhoneVerified: true,
        defaultLocation: {
          city: defaultCity || '',
          coordinates: defaultCoordinates || [0, 0],
        },
      });

      await AuditLog.create({
        performedByUserId: user._id,
        action: 'USER_REGISTERED',
        resourceType: 'User',
        resourceId: user._id,
        ipAddress: req.ip,
      });
    }

    const token = generateToken(user._id);

    // Check if user also has a vendor profile
    const vendorProfile = await VendorProfile.findOne({ userId: user._id });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        interests: user.interests,
        defaultLocation: user.defaultLocation,
        vendorProfileId: vendorProfile ? vendorProfile._id : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Password Login for returning accounts
// @route   POST /api/auth/login-password
// @access  Public
exports.loginPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }

    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone or credentials' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: `Account suspended: ${user.suspensionReason}` });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone or credentials' });
    }

    const token = generateToken(user._id);
    const vendorProfile = await VendorProfile.findOne({ userId: user._id });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        interests: user.interests,
        defaultLocation: user.defaultLocation,
        vendorProfileId: vendorProfile ? vendorProfile._id : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user details & permissions
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const vendorProfile = await VendorProfile.findOne({ userId: user._id });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        interests: user.interests,
        defaultLocation: user.defaultLocation,
        vendorProfile,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer interests and location preferences
// @route   PUT /api/auth/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
  try {
    const { interests, city, pincode, coordinates } = req.body;
    const user = await User.findById(req.user._id);

    if (interests && Array.isArray(interests)) {
      user.interests = interests;
    }

    if (city || pincode || coordinates) {
      user.defaultLocation = {
        city: city || user.defaultLocation.city,
        pincode: pincode || user.defaultLocation.pincode,
        coordinates: coordinates || user.defaultLocation.coordinates,
      };
    }

    await user.save();
    return res.status(200).json({ success: true, message: 'Preferences updated', user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
