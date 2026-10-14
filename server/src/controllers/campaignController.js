const Campaign = require('../models/Campaign');
const AuditLog = require('../models/AuditLog');

// @desc    Get active advertising campaigns by placement key & city
// @route   GET /api/campaigns
// @access  Public
exports.getActiveCampaigns = async (req, res) => {
  try {
    const { placementKey, city, categorySlug } = req.query;
    const now = new Date();

    const filter = {
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (placementKey) filter.placementKey = placementKey;
    if (city) filter.$or = [{ targetCity: '' }, { targetCity: new RegExp(`^${city}$`, 'i') }];
    if (categorySlug) filter.$or = [{ targetCategorySlug: '' }, { targetCategorySlug: categorySlug }];

    const campaigns = await Campaign.find(filter).sort({ priority: -1, createdAt: -1 }).limit(10);

    return res.status(200).json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record unique view/impression on a campaign banner
// @route   POST /api/campaigns/:id/impression
// @access  Public
exports.recordImpression = async (req, res) => {
  try {
    await Campaign.findByIdAndUpdate(req.params.id, { $inc: { impressionsCount: 1 } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record ad click
// @route   POST /api/campaigns/:id/click
// @access  Public
exports.recordClick = async (req, res) => {
  try {
    await Campaign.findByIdAndUpdate(req.params.id, { $inc: { clicksCount: 1 } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
