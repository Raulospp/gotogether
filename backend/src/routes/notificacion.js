const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificacionController');
const auth = require('../middleware/auth');

router.get('/',                  auth, ctrl.getMisNotificaciones);
router.get('/no-leidas-count',   auth, ctrl.getNoLeidasCount);
router.patch('/leer-todas',      auth, ctrl.marcarTodasLeidas);
router.patch('/:id/leer',        auth, ctrl.marcarLeida);
router.delete('/',               auth, ctrl.eliminarTodas);
router.delete('/:id',            auth, ctrl.eliminarNotificacion);

module.exports = router;
