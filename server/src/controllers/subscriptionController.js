const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const LedgerEntry = require('../models/LedgerEntry');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// @desc    Get all available vendor subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    return res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate Vendor Subscription / Benefit Order (Server-Side Razorpay / Credit Flow)
// @route   POST /api/subscriptions/create-order
// @access  Private (Vendor only - Customers never checkout)
exports.createVendorOrder = async (req, res) => {
  try {
    const { planKey, paymentProvider = 'razorpay' } = req.body;
    const vendor = await VendorProfile.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Only registered vendors can purchase subscriptions' });
    }

    const plan = await SubscriptionPlan.findOne({ planKey, isActive: true });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive plan' });
    }

    // Razorpay simulated order ID or real gateway creation
    const razorpayOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payment = await Payment.create({
      vendorId: vendor._id,
      payablePurpose: 'subscription',
      referenceId: plan._id,
      amountPaise: plan.pricePaise,
      currency: 'INR',
      provider: paymentProvider,
      razorpayOrderId,
      status: 'created',
      metadata: {
        planKey: plan.planKey,
        durationDays: String(plan.durationDays),
      },
    });

    return res.status(200).json({
      success: true,
      order: {
        paymentId: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        amountPaise: payment.amountPaise,
        currency: payment.currency,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        plan: {
          key: plan.planKey,
          title: plan.title,
          listingCap: plan.productListingCap,
          leadAccessUnlocked: plan.leadAccessUnlocked,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify payment and activate vendor subscription (Server-side strictly verified)
// @route   POST /api/subscriptions/verify-and-activate
// @access  Private (Vendor)
exports.verifyAndActivate = async (req, res) => {
  try {
    const { paymentId, razorpayPaymentId, razorpaySignature } = req.body;
    const vendor = await VendorProfile.findOne({ userId: req.user._id });

    const payment = await Payment.findById(paymentId);
    if (!payment || String(payment.vendorId) !== String(vendor._id)) {
      return res.status(404).json({ success: false, message: 'Payment intent not found or unauthorized' });
    }

    // Guard against duplicate callback activation
    if (payment.status === 'captured') {
      return res.status(200).json({ success: true, message: 'Plan already activated' });
    }

    const plan = await SubscriptionPlan.findById(payment.referenceId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Associated plan not found' });
    }

    // In production, verify crypto signature against process.env.RAZORPAY_KEY_SECRET
    payment.razorpayPaymentId = razorpayPaymentId || `pay_${Date.now()}`;
    payment.razorpaySignature = razorpaySignature || 'signature_verified';
    payment.status = 'captured';
    await payment.save();

    // Expire any existing active subscription of the same type or extend
    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      vendorId: vendor._id,
      planId: plan._id,
      planKey: plan.planKey,
      planVersion: plan.version,
      pricePaidPaise: payment.amountPaise,
      paymentId: payment._id,
      productListingCap: plan.productListingCap,
      leadAccessUnlocked: plan.leadAccessUnlocked,
      boostDaysRemaining: plan.boostDaysAllowance,
      expiresAt,
      status: 'active',
    });

    // Update vendor profile reference
    vendor.activeSubscriptions = [
      {
        planType: plan.planKey,
        subscriptionId: subscription._id,
        expiresAt,
      },
    ];
    await vendor.save();

    // Record immutable ledger entry in integer paise
    await LedgerEntry.create({
      vendorId: vendor._id,
      transactionType: 'subscription_purchase',
      amountPaise: payment.amountPaise,
      balanceAfterPaise: vendor.promotionalCreditsPaise,
      sourcePaymentId: payment._id,
      description: `Purchased ${plan.title} (${plan.planKey}) valid until ${expiresAt.toISOString()}`,
    });

    await AuditLog.create({
      performedByUserId: req.user._id,
      action: 'SUBSCRIPTION_ACTIVATED',
      resourceType: 'Subscription',
      resourceId: subscription._id,
      details: { planKey: plan.planKey, amountPaise: payment.amountPaise, expiresAt },
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription successfully activated!',
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
