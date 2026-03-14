import bcrypt from "bcryptjs";
import { findUserById, updateUser } from "../models/userModel.js";
import { pool } from "../config/database.js";

// ── Ver perfil propio ─────────────────────────────────────────────────────────

export async function getProfile(req, res) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Actualizar perfil ─────────────────────────────────────────────────────────

export async function updateProfile(req, res) {
  try {
    const updated = await updateUser(req.user.id, req.body);

    if (!updated) {
      return res.status(400).json({ message: "No se enviaron campos válidos para actualizar" });
    }

    res.json({ message: "Perfil actualizado exitosamente", user: updated });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Cambiar contraseña ────────────────────────────────────────────────────────

export async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Se requieren current_password y new_password" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];

    const match = await bcrypt.compare(current_password, user.password);
    if (!match) {
      return res.status(401).json({ message: "La contraseña actual es incorrecta" });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user.id]);

    res.json({ message: "Contraseña actualizada exitosamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
