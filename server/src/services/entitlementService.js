const VendorProfile = require('../models/VendorProfile');
const Subscription = require('../models/Subscription');
const EntitlementGrant = require('../models/EntitlementGrant');
const Listing = require('../models/Listing');

/**
 * Checks if a vendor has an active subscription that unlocks consented customer leads
 */
const checkVendorLeadAccess = async (vendorId) => {
  const now = new Date();
  const activeSubscription = await Subscription.findOne({
    vendorId,
    status: 'active',
    leadAccessUnlocked: true,
    expiresAt: { $gt: now },
  });

  return Boolean(activeSubscription);
};

/**
 * Calculates current active listing capacity for vendor
 * Free tier: 1 active listing
 * Paid plan: plan cap + unexpired extra listing slots grants
 */
const getVendorListingCapacity = async (vendorId) => {
  const now = new Date();

  // Check active paid subscription
  const activeSubscription = await Subscription.findOne({
    vendorId,
    status: 'active',
    expiresAt: { $gt: now },
  });

  let baseCap = 1; // Free tier baseline
  if (activeSubscription) {
    baseCap = activeSubscription.productListingCap;
  }

  // Add unexpired admin grants for extra slots
  const extraGrants = await EntitlementGrant.find({
    vendorId,
    grantType: 'extra_listing_slots',
    status: 'active',
    expiresAt: { $gt: now },
  });

  const extraSlots = extraGrants.reduce((sum, g) => sum + g.quantity, 0);

  // Count currently active + pending listings
  const currentActiveCount = await Listing.countDocuments({
    vendorId,
    status: { $in: ['active', 'pending_moderation'] },
  });

  return {
    totalCap: baseCap + extraSlots,
    baseCap,
    extraSlots,
    currentActiveCount,
    hasAvailableSlot: currentActiveCount < (baseCap + extraSlots),
    isSubscribed: Boolean(activeSubscription),
  };
};

module.exports = {
  checkVendorLeadAccess,
  getVendorListingCapacity,
};
