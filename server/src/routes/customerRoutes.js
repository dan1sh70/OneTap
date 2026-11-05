const express = require('express');
const router = express.Router();
const { toggleFavorite, getFavorites } = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');

router.post('/favorites/toggle', protect, toggleFavorite);
router.get('/favorites', protect, getFavorites);

module.exports = router;
