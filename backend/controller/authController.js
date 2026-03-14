import bcrypt from "bcryptjs";

import { pool } from "../config/database.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { findUserByEmail, findUserByVerifyToken } from "../models/userModel.js";
import { generateAuthToken, generateVerifyToken, verifyToken } from "../utils/jwt.js";

// ── Registro conductor ────────────────────────────────────────────────────────

export async function registerConductor(req, res) {
  try {
    let { name, email, password, city, university, car_model, plate, route, vehicle_type, capacity } = req.body;

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: "Faltan campos requeridos: name, email, password, city, car_model, plate" });
    }

    vehicle_type = vehicle_type || "carro";
    capacity     = capacity     || 4;
    route        = route        || "";

    const existe = await findUserByEmail(email);
    if (existe) return res.status(409).json({ message: "El correo ya está registrado" });

    const hashed      = await bcrypt.hash(password, 10);
    const verifyTk    = generateVerifyToken(email);

    const result = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,car_model,plate,route,vehicle_type,capacity,verified,verify_token)
       VALUES ($1,$2,$3,'conductor',$4,$5,$6,$7,$8,$9,$10,FALSE,$11)
       RETURNING id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,verified`,
      [name, email, hashed, city, university || null, car_model, plate, route, vehicle_type, capacity, verifyTk]
    );

    await sendVerificationEmail(email, name, verifyTk);

    res.status(201).json({
      message: "Conductor registrado. Revisa tu correo para verificar tu cuenta.",
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Registro pasajero ─────────────────────────────────────────────────────────

export async function registerPasajero(req, res) {
  try {
    const { name, email, password, city, university } = req.body;

    if (!name || !email || !password || !city) {
      return res.status(400).json({ message: "Faltan campos requeridos: name, email, password, city" });
    }

    const existe = await findUserByEmail(email);
    if (existe) return res.status(409).json({ message: "El correo ya está registrado" });

    const hashed   = await bcrypt.hash(password, 10);
    const verifyTk = generateVerifyToken(email);

    const result = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,verified,verify_token)
       VALUES ($1,$2,$3,'pasajero',$4,$5,FALSE,$6)
       RETURNING id,name,email,role,city,university,verified`,
      [name, email, hashed, city, university || null, verifyTk]
    );

    await sendVerificationEmail(email, name, verifyTk);

    res.status(201).json({
      message: "Pasajero registrado. Revisa tu correo para verificar tu cuenta.",
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Verificar email ───────────────────────────────────────────────────────────

export async function verifyEmail(req, res) {
  try {
    const { token } = req.query;

    if (!token) return res.status(400).json({ message: "Token no proporcionado" });

    // Validar que el token JWT sea válido y no haya expirado
    try {
      verifyToken(token);
    } catch {
      return res.status(400).json({ message: "El enlace de verificación es inválido o ya expiró" });
    }

    const user = await findUserByVerifyToken(token);
    if (!user) return res.status(404).json({ message: "Token no encontrado o ya fue utilizado" });

    if (user.verified) {
      return res.status(200).json({ message: "Tu cuenta ya estaba verificada. Puedes iniciar sesión." });
    }

    await pool.query(
      "UPDATE users SET verified = TRUE, verify_token = NULL WHERE id = $1",
      [user.id]
    );

    res.json({ message: "¡Cuenta verificada exitosamente! Ya puedes iniciar sesión." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Credenciales inválidas" });

    if (!user.verified) {
      return res.status(403).json({ message: "Debes verificar tu correo antes de iniciar sesión" });
    }

    const token = generateAuthToken(user);

    const { password: _, verify_token: __, ...safeUser } = user;

    res.json({ message: "Login exitoso", token, user: safeUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
