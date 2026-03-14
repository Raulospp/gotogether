import { pool } from "../config/database.js";

export async function findUserByEmail(email) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await pool.query(
    "SELECT id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, verified, created_at FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function findUserByVerifyToken(token) {
  const result = await pool.query("SELECT * FROM users WHERE verify_token = $1", [token]);
  return result.rows[0] || null;
}

export async function updateUser(id, fields) {
  const allowed = ["name", "city", "university", "car_model", "plate", "route", "vehicle_type", "capacity"];
  const updates = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${i}`);
      values.push(fields[key]);
      i++;
    }
  }

  if (updates.length === 0) return null;

  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${i}
     RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, verified`,
    values
  );
  return result.rows[0] || null;
}
