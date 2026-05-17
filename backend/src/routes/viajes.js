const express = require('express');
const router = express.Router();
const c = require('../controllers/viajeController');
const auth = require('../middleware/auth');

router.get('/mis-viajes',             auth, c.getMisViajes);
router.delete('/limpiar-pasados',     auth, c.limpiarViajesPasados);
router.get('/conductor/:conductorId', auth, c.getPickupsConductor);
router.get('/:id',                    auth, c.getViajeById);
router.patch('/:id/iniciar',          auth, c.iniciarViaje);
router.patch('/:id/finalizar',        auth, c.finalizarViaje);
router.patch('/:id/calificar',        auth, c.calificarViaje);
router.patch('/:id/ubicacion',        auth, c.updateUbicacion);

module.exports = router;