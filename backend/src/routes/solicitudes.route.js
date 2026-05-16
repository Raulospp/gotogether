import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { crearSolicitud, getPendientesCount, getMisSolicitudes, responderSolicitud, cancelarSolicitud, guardarPickup } from '../controllers/solicitudes.controller.js';
import { validateCrearSolicitud, validateResponderSolicitud, validateGuardarPickup, validatePagination } from '../validators/solicitud.validator.js';

const router = Router();

router.post('/',               authMiddleware, validateCrearSolicitud,   crearSolicitud);
router.get('/pendientes-count',authMiddleware,                           getPendientesCount);
router.get('/mis-solicitudes', authMiddleware, validatePagination,       getMisSolicitudes);
router.patch('/:id',           authMiddleware, validateResponderSolicitud,responderSolicitud);
router.delete('/:id',          authMiddleware,                           cancelarSolicitud);
router.patch('/:id/pickup',    authMiddleware, validateGuardarPickup,    guardarPickup);

export default router;
