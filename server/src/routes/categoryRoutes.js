const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, authorize } = require('../middlewares/auth');

// @desc    Get all categories or by vertical
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { vertical } = req.query;
    const filter = { isActive: true };
    if (vertical) filter.vertical = vertical;

    const categories = await Category.find(filter).sort({ displayOrder: 1, name: 1 });
    return res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, slug, vertical, iconUrl, parentCategoryId, displayOrder } = req.body;
    const category = await Category.create({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      vertical,
      iconUrl,
      parentCategoryId: parentCategoryId || null,
      displayOrder: displayOrder || 0,
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
