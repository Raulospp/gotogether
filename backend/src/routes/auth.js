const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register/conductor', authController.registerConductor);
router.post('/register/pasajero', authController.registerPasajero);
router.get('/verify', authController.verifyEmail);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/profile', authMiddleware, authController.updateProfile);

module.exports = router;