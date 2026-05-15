import { pool }           from '../config/db.js';
import { ROLES, ESTADOS } from '../constants/index.js';

// ─── Proyecciones SQL por rol ─────────────────────────────────────────────────

const FIELDS_CONDUCTOR = `
  s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
  p.id AS pasajero_id, p.name AS pasajero_name,
  p.city AS pasajero_city, p.university AS pasajero_university, p.phone AS pasajero_phone,
  s.pickup_lat, s.pickup_lon, s.pickup_name,
  s.pickup_direccion, s.pickup_universidad, s.destino_lat, s.destino_lon,
  COALESCE(h.schedule,'{}') AS schedule,
  COALESCE(h.routes,'{}')   AS routes,
  COALESCE(h.precio,'{}')   AS precio
`;

const FIELDS_PASAJERO = `
  s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
  c.id AS conductor_id, c.name AS conductor_name,
  c.city AS conductor_city, c.car_model, c.plate, c.vehicle_type, c.phone AS conductor_phone,
  COALESCE(h.schedule,'{}') AS schedule,
  COALESCE(h.routes,'{}')   AS routes,
  COALESCE(h.precio,'{}')   AS precio
`;

export const ViajeRepository = {

  findViajeActivo: async (solicitudId, conductorId, estado) => {
    const { rows } = await pool.query(
      'SELECT id FROM solicitudes WHERE id=$1 AND conductor_id=$2 AND estado=$3',
      [solicitudId, conductorId, estado],
    );
    return rows[0] ?? null;
  },

  iniciar: async (solicitudId) => {
    await pool.query(
      'UPDATE solicitudes SET estado=$1 WHERE id=$2',
      [ESTADOS.EN_CURSO, solicitudId],
    );
  },

  finalizar: async (solicitudId) => {
    await pool.query('DELETE FROM solicitudes WHERE id=$1', [solicitudId]);
  },

  limpiarPasados: async () => {
    const result = await pool.query(
      `DELETE FROM solicitudes WHERE estado=$1 AND fecha_viaje < CURRENT_DATE RETURNING id`,
      [ESTADOS.ACEPTADA],
    );
    return result.rowCount;
  },

  findMisViajes: async (userId, role) => {
    const esConductor = role === ROLES.CONDUCTOR;

    const queryText = esConductor
      ? `SELECT ${FIELDS_CONDUCTOR}
         FROM solicitudes s
         JOIN users p ON p.id = s.pasajero_id
         LEFT JOIN horarios h ON h.user_id = s.conductor_id
         WHERE s.conductor_id=$1
           AND s.estado IN ('aceptada','en_curso')
           AND s.fecha_viaje = CURRENT_DATE
         ORDER BY s.created_at DESC`
      : `SELECT ${FIELDS_PASAJERO}
         FROM solicitudes s
         JOIN users c ON c.id = s.conductor_id
         LEFT JOIN horarios h ON h.user_id = s.conductor_id
         WHERE s.pasajero_id=$1
           AND s.estado IN ('aceptada','en_curso')
           AND s.fecha_viaje = CURRENT_DATE
         ORDER BY s.created_at DESC`;

    const { rows } = await pool.query(queryText, [userId]);
    return rows;
  },

  findById: async (solicitudId, userId, role) => {
    const esConductor = role === ROLES.CONDUCTOR;

    const queryText = esConductor
      ? `SELECT ${FIELDS_CONDUCTOR}
         FROM solicitudes s
         JOIN users p ON p.id = s.pasajero_id
         LEFT JOIN horarios h ON h.user_id = s.conductor_id
         WHERE s.id=$1 AND s.conductor_id=$2`
      : `SELECT ${FIELDS_PASAJERO}
         FROM solicitudes s
         JOIN users c ON c.id = s.conductor_id
         LEFT JOIN horarios h ON h.user_id = s.conductor_id
         WHERE s.id=$1 AND s.pasajero_id=$2`;

    const { rows } = await pool.query(queryText, [solicitudId, userId]);
    return rows[0] ?? null;
  },
};
