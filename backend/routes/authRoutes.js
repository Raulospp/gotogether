import express from "express";
import {
  registerConductor,
  registerPasajero,
  verifyEmail,
  login,
  refreshAccessToken,
  logout
} from "../controller/authController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/register/conductor", registerConductor);
router.post("/register/pasajero",  registerPasajero);
router.get("/verify",              verifyEmail);
router.post("/login",              login);
router.post("/refresh",            refreshAccessToken);
router.post("/logout",             authMiddleware, logout);

export default router;
