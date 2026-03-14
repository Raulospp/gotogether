import express from "express";
import {
  createRating,
  getUserRatings,
  getTripHistory
} from "../controller/ratingController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/",           authMiddleware, createRating);
router.get("/history",     authMiddleware, getTripHistory);
router.get("/user/:id",    getUserRatings);

export default router;
