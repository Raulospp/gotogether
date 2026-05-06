const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, solicitudController.crearSolicitud);
router.get('/pendientes-count', authMiddleware, solicitudController.getPendientesCount);
router.get('/mis-solicitudes', authMiddleware, solicitudController.getMisSolicitudes);
router.patch('/:id/pickup', authMiddleware, solicitudController.updatePickup);
router.patch('/:id', authMiddleware, solicitudController.responderSolicitud);
router.delete('/:id', authMiddleware, solicitudController.cancelarSolicitud);

module.exports = router;