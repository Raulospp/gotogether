import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  listarFranjas,
  crearFranja,
  actualizarFranja,
  eliminarFranja,
  sugerirConductores,
} from '../controllers/franjas.controller.js';

const router = Router();

// Conductor: gestión de sus franjas horarias
router.get('/',      authMiddleware, listarFranjas);
router.post('/',     authMiddleware, crearFranja);
router.patch('/:id', authMiddleware, actualizarFranja);
router.delete('/:id',authMiddleware, eliminarFranja);

// Pasajero: descubrir conductores por destino + hora actual
router.get('/sugerir', authMiddleware, sugerirConductores);

export default router;
