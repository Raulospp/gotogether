import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/index.js';
import { iniciarViaje, finalizarViaje, limpiarPasados, getMisViajes, getViajeById } from '../controllers/viajes.controller.js';

const router = Router();

// Solo conductores pueden operar viajes
router.patch('/:id/iniciar',      authMiddleware, requireRole(ROLES.CONDUCTOR), iniciarViaje);
router.patch('/:id/finalizar',    authMiddleware, requireRole(ROLES.CONDUCTOR), finalizarViaje);
router.delete('/limpiar-pasados', authMiddleware, requireRole(ROLES.CONDUCTOR), limpiarPasados);

// Ambos roles pueden consultar sus viajes del día
router.get('/mis-viajes', authMiddleware, getMisViajes);
router.get('/:id',        authMiddleware, getViajeById);

export default router;
