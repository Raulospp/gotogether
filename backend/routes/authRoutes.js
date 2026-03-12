import express from "express";

import {
  registerConductor,
  login
} from "../controller/authController.js";

import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/register/conductor", registerConductor);

router.post("/login", login);

router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;