const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.get('/conductores', authMiddleware, userController.getConductores);
router.get('/pasajeros', authMiddleware, userController.getPasajeros);

module.exports = router;