import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { upsertHorario, getMiHorario } from '../controllers/horarios.controller.js';

const router = Router();

router.post('/',  authMiddleware, upsertHorario);
router.get('/me', authMiddleware, getMiHorario);

export default router;
