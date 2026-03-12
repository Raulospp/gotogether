import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../config/database.js";
import { sendVerificationEmail } from "../services/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET;

export async function registerConductor(req, res) {

  try {

    let { name, email, password, city, car_model, plate, route, vehicle_type, capacity } = req.body;

    vehicle_type = vehicle_type || "carro";
    capacity = capacity || 4;
    route = route || "";

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    const existe = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ message: "El correo ya esta registrado" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const verifyToken = jwt.sign(
      { email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const result = await pool.query(
      `INSERT INTO users (name,email,password,role,city,car_model,plate,route,vehicle_type,capacity,verified,verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11)
       RETURNING id,name,email,role,city,car_model,plate,route,vehicle_type,capacity,verified`,
      [name, email, hashed, "conductor", city, car_model, plate, route, vehicle_type, capacity, verifyToken]
    );

    const user = result.rows[0];

    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({
      message: "Conductor registrado. Revisa tu correo para verificar tu cuenta.",
      user
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error interno del servidor"
    });

  }

}

export async function login(req, res) {

  try {

    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Credenciales inválidas"
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        message: "Credenciales inválidas"
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: "Debes verificar tu correo antes de iniciar sesión"
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login exitoso",
      token,
      user
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error interno del servidor"
    });

  }

}