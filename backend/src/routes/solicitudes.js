import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import {
  crearSolicitud,
  getPendientesCount,
  getMisSolicitudes,
  responderSolicitud,
  cancelarSolicitud,
  guardarPickup,
} from '../controllers/solicitudes.controller.js';

const router = Router();

router.post('/',                    authMiddleware, crearSolicitud);
router.get('/pendientes-count',     authMiddleware, getPendientesCount);
router.get('/mis-solicitudes',      authMiddleware, getMisSolicitudes);
router.patch('/:id',                authMiddleware, responderSolicitud);
router.delete('/:id',               authMiddleware, cancelarSolicitud);
router.patch('/:id/pickup',         authMiddleware, guardarPickup);

export default router;
