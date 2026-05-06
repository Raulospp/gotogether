const express = require('express');
const { geocode } = require('../controllers/geocodeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, geocode);

module.exports = router;