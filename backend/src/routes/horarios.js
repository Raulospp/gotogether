const express = require('express');
const router = express.Router();
const horarioController = require('../controllers/horarioController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, horarioController.guardarHorario);
router.get('/me', authMiddleware, horarioController.getMiHorario);

module.exports = router;