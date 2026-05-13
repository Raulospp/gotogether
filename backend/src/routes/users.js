import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getConductores, getPasajeros } from '../controllers/users.controller.js';

const router = Router();

router.get('/conductores', authMiddleware, getConductores);
router.get('/pasajeros',   authMiddleware, getPasajeros);

export default router;
