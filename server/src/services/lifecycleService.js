const Subscription = require('../models/Subscription');
const Listing = require('../models/Listing');
const ServiceRequest = require('../models/ServiceRequest');
const Campaign = require('../models/Campaign');
const EntitlementGrant = require('../models/EntitlementGrant');

/**
 * Background routine to process subscription expiries, service request timeouts, and listing expiries
 */
const runLifecycleChecks = async () => {
  const now = new Date();

  try {
    // 1. Expire outdated subscriptions
    const expiredSubs = await Subscription.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { $set: { status: 'expired' } }
    );
    if (expiredSubs.modifiedCount > 0) {
      console.log(`[Lifecycle Job] Marked ${expiredSubs.modifiedCount} subscriptions as expired.`);
    }

    // 2. Expire 24-hr timed-out service requests (Flow 1 & Section 07)
    const timedOutRequests = await ServiceRequest.updateMany(
      { status: 'submitted', expiresAt: { $lt: now } },
      { $set: { status: 'expired' } }
    );
    if (timedOutRequests.modifiedCount > 0) {
      console.log(`[Lifecycle Job] Marked ${timedOutRequests.modifiedCount} service requests as expired.`);
    }

    // 3. Expire listings older than 30 days
    const expiredListings = await Listing.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { $set: { status: 'expired' } }
    );
    if (expiredListings.modifiedCount > 0) {
      console.log(`[Lifecycle Job] Marked ${expiredListings.modifiedCount} product listings as expired.`);
    }

    // 4. Expire ad campaigns past end date
    const expiredCampaigns = await Campaign.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { $set: { status: 'expired' } }
    );
    if (expiredCampaigns.modifiedCount > 0) {
      console.log(`[Lifecycle Job] Marked ${expiredCampaigns.modifiedCount} ad campaigns as expired.`);
    }

    // 5. Expire admin entitlement grants
    await EntitlementGrant.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { $set: { status: 'expired' } }
    );
  } catch (err) {
    console.error(`[Lifecycle Job Error]: ${err.message}`);
  }
};

/**
 * Starts periodic scheduler (every 10 minutes)
 */
const initLifecycleScheduler = (intervalMs = 10 * 60 * 1000) => {
  console.log('[Scheduler] Initialized background expiry and lifecycle service.');
  // Run once on launch
  runLifecycleChecks();
  // Set repeating interval
  setInterval(runLifecycleChecks, intervalMs);
};

module.exports = {
  runLifecycleChecks,
  initLifecycleScheduler,
};
