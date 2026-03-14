import express from "express";
import cors from "cors";

import authRoutes from "../routes/authRoutes.js";
import tripRoutes from "../routes/tripRoutes.js";
import userRoutes from "../routes/userRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rutas
app.use("/api/auth",  authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
});

export default app;
