import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getConductores, getPasajeros, getUsuariosOpuestos } from '../controllers/users.controller.js';

const router = Router();

/**
 * GET /api/users
 *   Pasajero  → devuelve conductores disponibles
 *   Conductor → devuelve pasajeros disponibles
 */
router.get('/', authMiddleware, getUsuariosOpuestos);

// Rutas explícitas con guard de rol
router.get('/conductores', authMiddleware, getConductores); // solo pasajeros
router.get('/pasajeros',   authMiddleware, getPasajeros);   // solo conductores

export default router;
