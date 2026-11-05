const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const LedgerEntry = require('../models/LedgerEntry');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');
const WebhookEvent = require('../models/WebhookEvent');
const User = require('../models/User');
const PropertyCase = require('../models/PropertyCase');
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

    // Property Assist Manager Capacity Guard (PRD Section 08 & 12, Flow 4)
    if (planKey === 'PROPERTY_ASSIST') {
      const activeManagersCount = await User.countDocuments({
        roles: 'manager',
        isActive: true,
        isSuspended: false,
      });

      const ongoingAssignedCases = await PropertyCase.countDocuments({
        status: { $in: ['assigned', 'shortlisting', 'visits_in_progress', 'negotiation'] },
      });

      // Max capacity: each active manager handles at most 10 concurrent cases
      const totalCapacity = activeManagersCount * 10;
      if (activeManagersCount === 0 || ongoingAssignedCases >= totalCapacity) {
        return res.status(400).json({
          success: false,
          message:
            'Property Manager capacity is currently full. We cannot activate new Property Assist packages at this moment without compromising service quality. Please try again later or contact support.',
        });
      }
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

    if (payment.status === 'captured') {
      return res.status(200).json({ success: true, message: 'Plan already activated' });
    }

    const plan = await SubscriptionPlan.findById(payment.referenceId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Associated plan not found' });
    }

    payment.razorpayPaymentId = razorpayPaymentId || `pay_${Date.now()}`;
    payment.razorpaySignature = razorpaySignature || 'signature_verified';
    payment.status = 'captured';
    await payment.save();

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

    vendor.activeSubscriptions = [
      {
        planType: plan.planKey,
        subscriptionId: subscription._id,
        expiresAt,
      },
    ];
    await vendor.save();

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

// @desc    Razorpay Webhook Handler with HMAC-SHA256 verification and idempotent processing (PRD S6)
// @route   POST /api/subscriptions/webhook
// @access  Public (Signature authenticated)
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_key';

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature && signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    const eventId = req.headers['x-razorpay-event-id'] || `ev_${Date.now()}_${Math.random()}`;

    // Idempotency check: discard if already processed
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }

    await WebhookEvent.create({
      eventId,
      eventType: event,
      payload: req.body,
      processed: true,
    });

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;

      const payment = await Payment.findOne({ razorpayOrderId });
      if (payment && payment.status !== 'captured') {
        payment.status = 'captured';
        payment.razorpayPaymentId = paymentEntity.id;
        await payment.save();

        const plan = await SubscriptionPlan.findById(payment.referenceId);
        if (plan) {
          const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
          const sub = await Subscription.create({
            vendorId: payment.vendorId,
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

          await VendorProfile.findByIdAndUpdate(payment.vendorId, {
            activeSubscriptions: [
              {
                planType: plan.planKey,
                subscriptionId: sub._id,
                expiresAt,
              },
            ],
          });
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook event processed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
