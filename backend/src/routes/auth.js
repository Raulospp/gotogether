import { Router } from 'express';
import { authMiddleware }          from '../middlewares/auth.middleware.js';
import { registerConductor, registerPasajero, login, refresh, logout, logoutAll, getMe, updateProfile } from '../controllers/auth.controller.js';
import { validateRegisterConductor, validateRegisterPasajero, validateLogin, validateUpdateProfile } from '../validators/auth.validator.js';

const router = Router();

router.post('/register/conductor', validateRegisterConductor, registerConductor);
router.post('/register/pasajero',  validateRegisterPasajero,  registerPasajero);
router.post('/login',              validateLogin,              login);
router.post('/refresh',            refresh);
router.delete('/logout',     authMiddleware, logout);
router.delete('/logout-all', authMiddleware, logoutAll);
router.get('/me',            authMiddleware, getMe);
router.patch('/profile',     authMiddleware, validateUpdateProfile, updateProfile);

export default router;
