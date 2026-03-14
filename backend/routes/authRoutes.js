import express from "express";
import {
  registerConductor,
  registerPasajero,
  verifyEmail,
  login
} from "../controller/authController.js";

const router = express.Router();

router.post("/register/conductor", registerConductor);
router.post("/register/pasajero",  registerPasajero);
router.get("/verify",              verifyEmail);
router.post("/login",              login);

export default router;
