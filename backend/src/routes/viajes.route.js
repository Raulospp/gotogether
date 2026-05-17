import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/index.js';
import {
  iniciarViaje,
  finalizarViaje,
  limpiarPasados,
  getMisViajes,
  getViajeById,
  getRutaConsolidada,
  entregarPasajero,
} from '../controllers/viajes.controller.js';

const router = Router();

// ── Solo conductores ──────────────────────────────────────────────────────────
router.patch('/:id/iniciar',    authMiddleware, requireRole(ROLES.CONDUCTOR), iniciarViaje);
router.patch('/:id/finalizar',  authMiddleware, requireRole(ROLES.CONDUCTOR), finalizarViaje);
router.delete('/limpiar-pasados', authMiddleware, requireRole(ROLES.CONDUCTOR), limpiarPasados);

// Ruta consolidada con todos los pickups del día
router.get('/ruta-consolidada', authMiddleware, requireRole(ROLES.CONDUCTOR), getRutaConsolidada);

// El conductor marca a un pasajero como entregado → se elimina de su lista de ruta
router.delete('/:id/entregar',  authMiddleware, requireRole(ROLES.CONDUCTOR), entregarPasajero);

// ── Ambos roles ───────────────────────────────────────────────────────────────
router.get('/mis-viajes', authMiddleware, getMisViajes);
router.get('/:id',        authMiddleware, getViajeById);

export default router;
