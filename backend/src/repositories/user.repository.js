import { pool } from '../config/db.js';

const USER_PUBLIC_FIELDS =
  'id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone,created_at';

export const UserRepository = {

  findByEmail: async (email) => {
    const { rows } = await pool.query(
      'SELECT id,name,email,password,role,city,university,car_model,plate,route,vehicle_type,capacity,phone FROM users WHERE email=$1',
      [email],
    );
    return rows[0] ?? null;
  },

  findById: async (id) => {
    const { rows } = await pool.query(
      `SELECT ${USER_PUBLIC_FIELDS} FROM users WHERE id=$1`,
      [id],
    );
    return rows[0] ?? null;
  },

  emailExists: async (email) => {
    const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    return rows.length > 0;
  },

  createConductor: async ({ name, email, hashedPassword, city, car_model, plate, route, vehicle_type, capacity, phone }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,password,role,city,car_model,plate,route,vehicle_type,capacity,phone,verified)
       VALUES ($1,$2,$3,'conductor',$4,$5,$6,$7,$8,$9,$10,TRUE)
       RETURNING ${USER_PUBLIC_FIELDS}`,
      [name, email, hashedPassword, city, car_model, plate, route, vehicle_type, capacity, phone],
    );
    return rows[0];
  },

  createPasajero: async ({ name, email, hashedPassword, city, university, route, phone }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,route,phone,verified)
       VALUES ($1,$2,$3,'pasajero',$4,$5,$6,$7,TRUE)
       RETURNING ${USER_PUBLIC_FIELDS}`,
      [name, email, hashedPassword, city, university, route, phone],
    );
    return rows[0];
  },

  update: async (id, fields, values) => {
    const setClauses = fields.map((f, i) => `${f}=$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses} WHERE id=$${fields.length + 1}
       RETURNING id,name,email,role,city,university,car_model,plate,vehicle_type,capacity,phone`,
      [...values, id],
    );
    return rows[0];
  },

  findConductores: async (excludeUserId) => {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes,   '{}') AS routes,
        COALESCE(h.precio,   '{}') AS precio,
        u.capacity - COALESCE(
          (SELECT COUNT(*) FROM solicitudes s
           WHERE s.conductor_id = u.id AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE),
          0
        ) AS cupos_disponibles,
        EXISTS(
          SELECT 1 FROM solicitudes s
          WHERE s.conductor_id = u.id AND s.pasajero_id = $2
          AND s.estado IN ('pendiente','aceptada') AND s.fecha_viaje = CURRENT_DATE
        ) AS ya_solicitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = 'conductor' AND u.id != $1
      ORDER BY u.created_at DESC
    `, [excludeUserId, excludeUserId]);
    return rows;
  },

  findPasajeros: async (excludeUserId) => {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.university, u.phone,
        COALESCE(h.schedule, '{}') AS schedule,
        EXISTS(
          SELECT 1 FROM solicitudes s
          WHERE s.pasajero_id = u.id AND s.conductor_id = $2
          AND s.estado IN ('pendiente','aceptada') AND s.fecha_viaje = CURRENT_DATE
        ) AS ya_invitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = 'pasajero' AND u.id != $1
      ORDER BY u.created_at DESC
    `, [excludeUserId, excludeUserId]);
    return rows;
  },

  // ── Para price.controller: tarifa del conductor con su nombre ─────────────
  findTarifaConNombre: async (conductorId) => {
    const { rows } = await pool.query(
      `SELECT h.precio, u.name
       FROM horarios h
       JOIN users u ON u.id = h.user_id
       WHERE h.user_id=$1`,
      [conductorId],
    );
    return rows[0] ?? null;
  },
};
