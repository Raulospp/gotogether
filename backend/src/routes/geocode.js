const express = require('express');
const router = express.Router();
const geocodeController = require('../controllers/geocodeController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, geocodeController.geocode);

module.exports = router;