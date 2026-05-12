import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import {
  geocodeGet,
  geocodePost,
  saveRoute,
  getRoute,
  getSuggestedDriversHandler,
  validatePickup,
  savePickup,
  getMyPickup,
} from '../controllers/maps.controller.js';

const router = Router();

router.get('/geocode',                    geocodeGet);
router.post('/geocode',    authMiddleware, geocodePost);
router.post('/route',      authMiddleware, saveRoute);
router.get('/route/:conductorId',         authMiddleware, getRoute);
router.get('/suggested-drivers',          authMiddleware, getSuggestedDriversHandler);
router.post('/validate-pickup',           authMiddleware, validatePickup);
router.post('/save-pickup',               authMiddleware, savePickup);
router.get('/my-pickup/:solicitudId',     authMiddleware, getMyPickup);

export default router;
