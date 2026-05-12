import { pool }           from '../config/db.js';
import { ROLES, ESTADOS } from '../constants/index.js';

// ─── SQL compartido ───────────────────────────────────────────────────────────

const CUPOS_DISPONIBLES = `
  u.capacity - COALESCE(
    (SELECT COUNT(*) FROM solicitudes s
     WHERE s.conductor_id = u.id
       AND s.estado = '${ESTADOS.ACEPTADA}'
       AND s.fecha_viaje = CURRENT_DATE),
    0
  ) AS cupos_disponibles
`;

const YA_SOLICITADO = (param) => `
  EXISTS(
    SELECT 1 FROM solicitudes s
    WHERE s.conductor_id = u.id AND s.pasajero_id = ${param}
    AND s.estado IN ('${ESTADOS.PENDIENTE}','${ESTADOS.ACEPTADA}')
    AND s.fecha_viaje = CURRENT_DATE
  ) AS ya_solicitado
`;

const YA_INVITADO = (param) => `
  EXISTS(
    SELECT 1 FROM solicitudes s
    WHERE s.pasajero_id = u.id AND s.conductor_id = ${param}
    AND s.estado IN ('${ESTADOS.PENDIENTE}','${ESTADOS.ACEPTADA}')
    AND s.fecha_viaje = CURRENT_DATE
  ) AS ya_invitado
`;

// ── GET /api/users/conductores ────────────────────────────────────────────────

export async function getConductores(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes,   '{}') AS routes,
        COALESCE(h.precio,   '{}') AS precio,
        ${CUPOS_DISPONIBLES},
        ${YA_SOLICITADO('$2')}
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, [ROLES.CONDUCTOR, req.user.id]);

    res.json(rows);
  } catch (err) { next(err); }
}

// ── GET /api/users/pasajeros ──────────────────────────────────────────────────

export async function getPasajeros(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.university, u.phone,
        COALESCE(h.schedule, '{}') AS schedule,
        ${YA_INVITADO('$2')}
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, [ROLES.PASAJERO, req.user.id]);

    res.json(rows);
  } catch (err) { next(err); }
}
