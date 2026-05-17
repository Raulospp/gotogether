import { pool }    from '../config/db.js';
import { ESTADOS } from '../constants/index.js';

export const SolicitudRepository = {

  existeHoy: async (pasajeroId, conductorId) => {
    const { rows } = await pool.query(
      `SELECT id FROM solicitudes
       WHERE pasajero_id=$1 AND conductor_id=$2
         AND estado IN ('pendiente','aceptada')
         AND fecha_viaje = CURRENT_DATE`,
      [pasajeroId, conductorId],
    );
    return rows.length > 0;
  },

  /** Creación simple sin coords (conductor invita) */
  create: async (pasajeroId, conductorId, iniciadoPor) => {
    const { rows } = await pool.query(
      `INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje)
       VALUES ($1,$2,$3,CURRENT_DATE) RETURNING *`,
      [pasajeroId, conductorId, iniciadoPor],
    );
    return rows[0];
  },

  /** Creación con pickup + destino en un solo paso (pasajero solicita) */
  createConPickup: async (pasajeroId, conductorId, iniciadoPor, pickupData) => {
    const {
      pickup_lat, pickup_lon, pickup_name,
      pickup_direccion, pickup_universidad,
      destino_lat, destino_lon,
    } = pickupData;

    const { rows } = await pool.query(
      `INSERT INTO solicitudes
         (pasajero_id, conductor_id, iniciado_por, fecha_viaje,
          pickup_lat, pickup_lon, pickup_name,
          pickup_direccion, pickup_universidad,
          destino_lat, destino_lon)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [pasajeroId, conductorId, iniciadoPor,
       pickup_lat, pickup_lon, pickup_name,
       pickup_direccion, pickup_universidad,
       destino_lat, destino_lon],
    );
    return rows[0];
  },

  findById: async (id) => {
    const { rows } = await pool.query(
      'SELECT id,estado,pasajero_id,conductor_id,iniciado_por FROM solicitudes WHERE id=$1',
      [id],
    );
    return rows[0] ?? null;
  },

  countPendientesPara: async (userId) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM solicitudes
       WHERE iniciado_por != $1
         AND (conductor_id=$1 OR pasajero_id=$1)
         AND estado='pendiente'`,
      [userId],
    );
    return parseInt(rows[0].count, 10);
  },

  findByUsuario: async (userId, { page = 1, limit = 20 } = {}) => {
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(`
      SELECT
        s.id, s.estado, s.created_at, s.iniciado_por,
        s.pasajero_id, s.conductor_id,
        s.pickup_lat, s.pickup_lon, s.pickup_name,
        s.pickup_direccion, s.pickup_universidad,
        s.destino_lat, s.destino_lon,
        p.name AS pasajero_name, p.city AS pasajero_city,
        p.university AS pasajero_university, p.phone AS pasajero_phone,
        c.name AS conductor_name, c.city AS conductor_city,
        c.car_model, c.vehicle_type, c.phone AS conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE s.pasajero_id=$1 OR s.conductor_id=$1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    return rows;
  },

  updateEstado: async (id, estado) => {
    const { rows } = await pool.query(
      'UPDATE solicitudes SET estado=$1 WHERE id=$2 RETURNING *',
      [estado, id],
    );
    return rows[0];
  },

  deleteById: async (id) => {
    await pool.query('DELETE FROM solicitudes WHERE id=$1', [id]);
  },

  updatePickup: async (id, userId, pickupData) => {
    const {
      pickup_lat, pickup_lon, pickup_name,
      pickup_direccion, pickup_universidad,
      destino_lat, destino_lon,
    } = pickupData;
    const { rows } = await pool.query(`
      UPDATE solicitudes
      SET pickup_lat=$1, pickup_lon=$2, pickup_name=$3,
          pickup_direccion=$4, pickup_universidad=$5,
          destino_lat=$6, destino_lon=$7
      WHERE id=$8 AND (pasajero_id=$9 OR conductor_id=$9)
      RETURNING id
    `, [pickup_lat, pickup_lon, pickup_name, pickup_direccion, pickup_universidad,
        destino_lat, destino_lon, id, userId]);
    return rows[0] ?? null;
  },

  findPickupBySolicitudAndConductor: async (solicitudId, conductorId) => {
    const { rows } = await pool.query(`
      SELECT s.pickup_lat, s.pickup_lon, s.pickup_name,
             p.name AS pasajero_name, p.phone AS pasajero_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      WHERE s.id=$1 AND s.conductor_id=$2 AND s.estado=$3
    `, [solicitudId, conductorId, ESTADOS.ACEPTADA]);
    return rows[0] ?? null;
  },

  findSolicitudConPrecio: async (solicitudId, pasajeroId) => {
    const { rows } = await pool.query(`
      SELECT
        s.id AS solicitud_id, s.pickup_lat, s.pickup_lon,
        s.destino_lat, s.destino_lon, s.pickup_direccion, s.pickup_universidad,
        h.precio AS conductor_precio, c.name AS conductor_name
      FROM solicitudes s
      JOIN users c ON c.id = s.conductor_id
      LEFT JOIN horarios h ON h.user_id = s.conductor_id
      WHERE s.id=$1 AND s.pasajero_id=$2
    `, [solicitudId, pasajeroId]);
    return rows[0] ?? null;
  },

  // ── Para ruta consolidada: todos los pasajeros activos del conductor hoy ──
  findPasajerosActivosConductor: async (conductorId) => {
    const { rows } = await pool.query(`
      SELECT
        s.id AS solicitud_id,
        s.estado,
        s.pickup_lat, s.pickup_lon, s.pickup_name,
        s.pickup_direccion, s.pickup_universidad,
        s.destino_lat, s.destino_lon,
        p.id AS pasajero_id, p.name AS pasajero_name, p.phone AS pasajero_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      WHERE s.conductor_id = $1
        AND s.estado IN ('aceptada','en_curso')
        AND s.fecha_viaje = CURRENT_DATE
      ORDER BY s.created_at ASC
    `, [conductorId]);
    return rows;
  },

  // ── Eliminar pasajero de la ruta (al llegar a su destino) ─────────────────
  marcarPasajeroEntregado: async (solicitudId, conductorId) => {
    const { rows } = await pool.query(`
      DELETE FROM solicitudes
      WHERE id=$1 AND conductor_id=$2 AND estado='en_curso'
      RETURNING id, pasajero_id
    `, [solicitudId, conductorId]);
    return rows[0] ?? null;
  },
};
