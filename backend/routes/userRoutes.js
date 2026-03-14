import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword
} from "../controller/userController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/profile",          authMiddleware, getProfile);
router.put("/profile",          authMiddleware, updateProfile);
router.patch("/change-password",authMiddleware, changePassword);

export default router;
