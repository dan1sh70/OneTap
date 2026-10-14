const express = require('express');
const router = express.Router();
const {
  getProperties,
  createPropertyListing,
  submitCustomerRequirement,
} = require('../controllers/propertyController');
const { protect } = require('../middlewares/auth');

router.get('/', getProperties);
router.post('/', protect, createPropertyListing);
router.post('/customer-requirement', protect, submitCustomerRequirement);

module.exports = router;
