import { pool }                     from '../config/db.js';
import { calcularResumenConductor } from '../services/price.service.js';
import { asyncHandler }             from '../utils/async-handler.js';
import { ok, fail }                 from '../utils/response.js';
import { AppError }                 from '../utils/AppError.js';
import { ROLES, ESTADOS, HTTP }     from '../constants/index.js';

const VIAJE_FIELDS_CONDUCTOR = `
  s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
  p.id AS pasajero_id, p.name AS pasajero_name,
  p.city AS pasajero_city, p.university AS pasajero_university, p.phone AS pasajero_phone,
  s.pickup_lat, s.pickup_lon, s.pickup_name,
  s.pickup_direccion, s.pickup_universidad, s.destino_lat, s.destino_lon,
  COALESCE(h.schedule,'{}') AS schedule, COALESCE(h.routes,'{}') AS routes, COALESCE(h.precio,'{}') AS precio
`;

const VIAJE_FIELDS_PASAJERO = `
  s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
  c.id AS conductor_id, c.name AS conductor_name,
  c.city AS conductor_city, c.car_model, c.plate, c.vehicle_type, c.phone AS conductor_phone,
  COALESCE(h.schedule,'{}') AS schedule, COALESCE(h.routes,'{}') AS routes, COALESCE(h.precio,'{}') AS precio
`;

export const iniciarViaje = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id FROM solicitudes WHERE id=$1 AND conductor_id=$2 AND estado=$3`,
    [req.params.id, req.user.id, ESTADOS.ACEPTADA],
  );
  if (!rows.length) throw AppError.forbidden('No puedes iniciar este viaje', 'VIAJE_FORBIDDEN');

  await pool.query('UPDATE solicitudes SET estado=$1 WHERE id=$2', [ESTADOS.EN_CURSO, req.params.id]);
  ok(res, null, 'Viaje iniciado');
});

export const finalizarViaje = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id FROM solicitudes WHERE id=$1 AND conductor_id=$2 AND estado=$3`,
    [req.params.id, req.user.id, ESTADOS.EN_CURSO],
  );
  if (!rows.length) throw AppError.forbidden('No puedes finalizar este viaje', 'VIAJE_FORBIDDEN');

  await pool.query('DELETE FROM solicitudes WHERE id=$1', [req.params.id]);
  ok(res, null, 'Viaje finalizado');
});

export const limpiarPasados = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `DELETE FROM solicitudes WHERE estado=$1 AND fecha_viaje < CURRENT_DATE RETURNING id`,
    [ESTADOS.ACEPTADA],
  );
  ok(res, { eliminados: result.rowCount }, `${result.rowCount} viajes pasados eliminados`);
});

export const getMisViajes = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const esConductor = userRole === ROLES.CONDUCTOR;

  const queryText = esConductor
    ? `SELECT ${VIAJE_FIELDS_CONDUCTOR} FROM solicitudes s
       JOIN users p ON p.id = s.pasajero_id
       LEFT JOIN horarios h ON h.user_id = s.conductor_id
       WHERE s.conductor_id=$1 AND s.estado IN ('aceptada','en_curso') AND s.fecha_viaje = CURRENT_DATE
       ORDER BY s.created_at DESC`
    : `SELECT ${VIAJE_FIELDS_PASAJERO} FROM solicitudes s
       JOIN users c ON c.id = s.conductor_id
       LEFT JOIN horarios h ON h.user_id = s.conductor_id
       WHERE s.pasajero_id=$1 AND s.estado IN ('aceptada','en_curso') AND s.fecha_viaje = CURRENT_DATE
       ORDER BY s.created_at DESC`;

  const { rows } = await pool.query(queryText, [userId]);

  if (esConductor && rows.length > 0) {
    try {
      const resumen   = await calcularResumenConductor(userId, pool);
      const precioMap = Object.fromEntries(resumen.pasajeros.map(p => [p.solicitud_id, p]));
      return ok(res, rows.map(row => ({
        ...row,
        precio_pasajero: precioMap[row.solicitud_id]?.precio      ?? null,
        distancia_km:    precioMap[row.solicitud_id]?.distanciaKm ?? null,
        tarifa_cop_km:   resumen.tarifaCopKm,
        total_conductor: resumen.totalConductor,
        resumen_precio:  resumen.resumen,
      })), 'Viajes obtenidos');
    } catch { /* devolver sin precios si falla el cálculo */ }
  }

  ok(res, rows, 'Viajes obtenidos');
});

export const getViajeById = asyncHandler(async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const esConductor = userRole === ROLES.CONDUCTOR;

  const queryText = esConductor
    ? `SELECT ${VIAJE_FIELDS_CONDUCTOR} FROM solicitudes s
       JOIN users p ON p.id = s.pasajero_id
       LEFT JOIN horarios h ON h.user_id = s.conductor_id
       WHERE s.id=$1 AND s.conductor_id=$2`
    : `SELECT ${VIAJE_FIELDS_PASAJERO} FROM solicitudes s
       JOIN users c ON c.id = s.conductor_id
       LEFT JOIN horarios h ON h.user_id = s.conductor_id
       WHERE s.id=$1 AND s.pasajero_id=$2`;

  const { rows } = await pool.query(queryText, [req.params.id, userId]);
  if (!rows.length) throw AppError.notFound('Viaje no encontrado', 'VIAJE_NOT_FOUND');

  ok(res, rows[0], 'Viaje obtenido');
});
