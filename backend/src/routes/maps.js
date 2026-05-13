import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { geocodeGet, geocodePost, saveRoute, getRoute, getSuggestedDriversHandler, validatePickup, savePickup, getMyPickup } from '../controllers/maps.controller.js';
import { validateSaveRoute, validateValidatePickup, validateSavePickup } from '../validators/maps.validator.js';

const router = Router();

router.get('/geocode',              geocodeGet);
router.post('/geocode',             authMiddleware,              geocodePost);
router.post('/route',               authMiddleware, validateSaveRoute,      saveRoute);
router.get('/route/:conductorId',   authMiddleware,              getRoute);
router.get('/suggested-drivers',    authMiddleware,              getSuggestedDriversHandler);
router.post('/validate-pickup',     authMiddleware, validateValidatePickup, validatePickup);
router.post('/save-pickup',         authMiddleware, validateSavePickup,     savePickup);
router.get('/my-pickup/:solicitudId', authMiddleware,            getMyPickup);

export default router;
