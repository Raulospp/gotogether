import { Router } from 'express';
import { authMiddleware }  from '../middlewares/auth.middleware.js';
import { requireRole }     from '../middlewares/auth.middleware.js';
import { ROLES }           from '../constants/index.js';
import { setTarifa, getTarifa, getResumen, getPrecioPasajero, getTarifaConductor } from '../controllers/price.controller.js';
import { validateSetTarifa, validateTarifaConductorQuery } from '../validators/price.validator.js';

const router = Router();

router.patch('/tarifa',                      authMiddleware, requireRole(ROLES.CONDUCTOR), validateSetTarifa, setTarifa);
router.get('/tarifa',                        authMiddleware, requireRole(ROLES.CONDUCTOR), getTarifa);
router.get('/resumen',                       authMiddleware, requireRole(ROLES.CONDUCTOR), getResumen);
router.get('/pasajero/:solicitudId',         authMiddleware,                               getPrecioPasajero);
router.get('/conductor/:conductorId/tarifa', authMiddleware, validateTarifaConductorQuery, getTarifaConductor);

export default router;
