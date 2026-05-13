import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { iniciarViaje, finalizarViaje, limpiarPasados, getMisViajes, getViajeById } from '../controllers/viajes.controller.js';

const router = Router();

router.delete('/limpiar-pasados', authMiddleware, limpiarPasados);
router.get('/mis-viajes',         authMiddleware, getMisViajes);
router.get('/:id',                authMiddleware, getViajeById);
router.patch('/:id/iniciar',      authMiddleware, iniciarViaje);
router.patch('/:id/finalizar',    authMiddleware, finalizarViaje);

export default router;
