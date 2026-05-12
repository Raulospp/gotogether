import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import {
  registerConductor,
  registerPasajero,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateProfile,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register/conductor', registerConductor);
router.post('/register/pasajero',  registerPasajero);
router.post('/login',              login);
router.post('/refresh',            refresh);
router.delete('/logout',     authMiddleware, logout);
router.delete('/logout-all', authMiddleware, logoutAll);
router.get('/me',            authMiddleware, getMe);
router.patch('/profile',     authMiddleware, updateProfile);

export default router;
