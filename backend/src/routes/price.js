import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import {
  setTarifa,
  getTarifa,
  getResumen,
  getPrecioPasajero,
  getTarifaConductor,
} from '../controllers/price.controller.js';

const router = Router();

router.patch('/tarifa',                          authMiddleware, setTarifa);
router.get('/tarifa',                            authMiddleware, getTarifa);
router.get('/resumen',                           authMiddleware, getResumen);
router.get('/pasajero/:solicitudId',             authMiddleware, getPrecioPasajero);
router.get('/conductor/:conductorId/tarifa',     authMiddleware, getTarifaConductor);

export default router;
