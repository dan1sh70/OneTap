const express = require('express');
const router = express.Router();
const { getActiveCampaigns, recordImpression, recordClick } = require('../controllers/campaignController');

router.get('/', getActiveCampaigns);
router.post('/:id/impression', recordImpression);
router.post('/:id/click', recordClick);

module.exports = router;
