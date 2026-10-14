const express = require('express');
const router = express.Router();
const { getListings, getListingById, createListing, updateListing } = require('../controllers/listingController');
const { protect } = require('../middlewares/auth');

router.get('/', getListings);
router.get('/:id', getListingById);
router.post('/', protect, createListing);
router.put('/:id', protect, updateListing);

module.exports = router;
