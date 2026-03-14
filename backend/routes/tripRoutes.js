import express from "express";
import {
  createTrip,
  getTrips,
  getTripById,
  joinTrip,
  cancelTrip,
  getMyTrips
} from "../controller/tripController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Públicas
router.get("/",      getTrips);
router.get("/mine",  authMiddleware, getMyTrips);
router.get("/:id",   getTripById);

// Protegidas
router.post("/",           authMiddleware, createTrip);
router.post("/:id/join",   authMiddleware, joinTrip);
router.patch("/:id/cancel",authMiddleware, cancelTrip);

export default router;
