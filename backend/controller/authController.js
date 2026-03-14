import bcrypt from "bcryptjs";

import { pool } from "../config/database.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { findUserByEmail, findUserByVerifyToken } from "../models/userModel.js";
import { generateAuthToken, generateRefreshToken, generateVerifyToken, verifyToken, verifyRefreshToken } from "../utils/jwt.js";
import { isValidEmail, isValidPassword, sanitize } from "../utils/validators.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MIN  = 15;

// ── Registro conductor ────────────────────────────────────────────────────────

export async function registerConductor(req, res) {
  try {
    let { name, email, password, city, university, car_model, plate, route, vehicle_type, capacity } = req.body;

    name     = sanitize(name);
    email    = sanitize(email);
    city     = sanitize(city);
    car_model= sanitize(car_model);
    plate    = sanitize(plate);

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: "Faltan campos requeridos: name, email, password, city, car_model, plate" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "El formato del email no es válido" });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    vehicle_type = vehicle_type || "carro";
    capacity     = capacity     || 4;
    route        = route        || "";

    const existe = await findUserByEmail(email);
    if (existe) return res.status(409).json({ message: "El correo ya está registrado" });

    const hashed   = await bcrypt.hash(password, 10);
    const verifyTk = generateVerifyToken(email);

    const result = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,car_model,plate,route,vehicle_type,capacity,verified,verify_token)
       VALUES ($1,$2,$3,'conductor',$4,$5,$6,$7,$8,$9,$10,TRUE,$11)
       RETURNING id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,verified`,
      [name, email, hashed, city, university || null, car_model, plate, route, vehicle_type, capacity, verifyTk]
    );

    res.status(201).json({
      message: "Conductor registrado exitosamente.",
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
    let { name, email, password, city, university } = req.body;

    name  = sanitize(name);
    email = sanitize(email);
    city  = sanitize(city);

    if (!name || !email || !password || !city) {
      return res.status(400).json({ message: "Faltan campos requeridos: name, email, password, city" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "El formato del email no es válido" });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await findUserByEmail(email);
    if (existe) return res.status(409).json({ message: "El correo ya está registrado" });

    const hashed   = await bcrypt.hash(password, 10);
    const verifyTk = generateVerifyToken(email);

    const result = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,verified,verify_token)
       VALUES ($1,$2,$3,'pasajero',$4,$5,TRUE,$6)
       RETURNING id,name,email,role,city,university,verified`,
      [name, email, hashed, city, university || null, verifyTk]
    );

    res.status(201).json({
      message: "Pasajero registrado exitosamente.",
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
    let { email, password } = req.body;

    email = sanitize(email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "El formato del email no es válido" });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    // Verificar si la cuenta está bloqueada
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutosRestantes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutosRestantes} minuto(s).`
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      const newAttempts = (user.login_attempts || 0) + 1;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MIN * 60 * 1000);
        await pool.query(
          "UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3",
          [newAttempts, lockedUntil, user.id]
        );
        return res.status(423).json({
          message: `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCK_DURATION_MIN} minutos.`
        });
      }

      await pool.query(
        "UPDATE users SET login_attempts = $1 WHERE id = $2",
        [newAttempts, user.id]
      );

      const intentosRestantes = MAX_LOGIN_ATTEMPTS - newAttempts;
      return res.status(401).json({
        message: `Credenciales inválidas. Te quedan ${intentosRestantes} intento(s) antes de bloquear la cuenta.`
      });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "Debes verificar tu correo antes de iniciar sesión" });
    }

    // Login exitoso: resetear intentos y generar tokens
    const accessToken  = generateAuthToken(user);
    const refreshToken = generateRefreshToken(user);

    await pool.query(
      "UPDATE users SET login_attempts = 0, locked_until = NULL, refresh_token = $1 WHERE id = $2",
      [refreshToken, user.id]
    );

    const { password: _, verify_token: __, refresh_token: ___, ...safeUser } = user;

    res.json({
      message: "Login exitoso",
      accessToken,
      refreshToken,
      user: safeUser
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Refresh token ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token no proporcionado" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ message: "Refresh token inválido o expirado. Inicia sesión de nuevo." });
    }

    // Verificar que el refresh token coincide con el guardado en BD
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND refresh_token = $2",
      [payload.id, refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Refresh token no válido. Inicia sesión de nuevo." });
    }

    const user        = result.rows[0];
    const accessToken = generateAuthToken(user);

    res.json({ accessToken });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req, res) {
  try {
    await pool.query(
      "UPDATE users SET refresh_token = NULL WHERE id = $1",
      [req.user.id]
    );
    res.json({ message: "Sesión cerrada exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
