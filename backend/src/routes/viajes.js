const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');
const authMiddleware = require('../middleware/auth');

// Rutas para viajes
router.patch('/:id/iniciar', authMiddleware, viajeController.iniciarViaje);
router.patch('/:id/finalizar', authMiddleware, viajeController.finalizarViaje);
router.get('/mis-viajes', authMiddleware, viajeController.getMisViajes);
router.get('/:id', authMiddleware, viajeController.getViajeById);
router.patch('/:id/ubicacion', authMiddleware, viajeController.updateUbicacion);
router.delete('/limpiar-pasados', authMiddleware, viajeController.limpiarViajesPasados);

module.exports = router;