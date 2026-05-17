import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { pool }                from '../config/db.js';
import { reverseGeocode }      from '../utils/routing.js';
import { AppError }            from '../utils/AppError.js';
import { ROLES, ESTADOS, MSG } from '../constants/index.js';

// ─── Verificar cupos disponibles del conductor ────────────────────────────────

async function verificarCupos(conductorId) {
  const { rows } = await pool.query(`
    SELECT u.capacity,
           COALESCE(
             (SELECT COUNT(*) FROM solicitudes s
              WHERE s.conductor_id = $1
                AND s.estado IN ('pendiente','aceptada')
                AND s.fecha_viaje = CURRENT_DATE),
             0
           ) AS ocupados
    FROM users u WHERE u.id = $1
  `, [conductorId]);

  if (!rows.length) throw AppError.notFound('Conductor no encontrado', 'CONDUCTOR_NOT_FOUND');

  const { capacity, ocupados } = rows[0];
  const disponibles = capacity - parseInt(ocupados, 10);

  if (disponibles <= 0)
    throw AppError.conflict(
      `El conductor no tiene cupos disponibles (capacidad: ${capacity})`,
      'SIN_CUPOS',
    );

  return disponibles;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const SolicitudService = {

  /**
   * Pasajero → envía solicitud con pickup + destino en un solo paso.
   * Conductor → invita al pasajero (sin coords aún; el pasajero las agrega después).
   */
  crear: async (userId, role, body) => {
    if (role === ROLES.PASAJERO) {
      const {
        conductor_id,
        pickup_lat, pickup_lon,
        destino_lat, destino_lon,
        pickup_direccion   = '',
        pickup_universidad = '',
      } = body;

      if (!conductor_id) throw AppError.badRequest('conductor_id requerido');

      if (await SolicitudRepository.existeHoy(userId, conductor_id))
        throw AppError.conflict('Ya tienes una solicitud para hoy con este conductor', 'SOLICITUD_DUPLICADA');

      await verificarCupos(conductor_id);

      // Nombre de pickup: dirección textual o reverse-geocode
      const pickup_name = pickup_direccion || (await reverseGeocode(pickup_lat, pickup_lon));

      // Crear solicitud + guardar pickup/destino en el mismo paso
      const solicitud = await SolicitudRepository.createConPickup(userId, conductor_id, userId, {
        pickup_lat, pickup_lon, pickup_name,
        pickup_direccion, pickup_universidad,
        destino_lat, destino_lon,
      });

      return solicitud;
    }

    if (role === ROLES.CONDUCTOR) {
      const { pasajero_id } = body;
      if (!pasajero_id) throw AppError.badRequest('pasajero_id requerido');

      if (await SolicitudRepository.existeHoy(pasajero_id, userId))
        throw AppError.conflict('Ya enviaste una invitación a este pasajero hoy', 'INVITACION_DUPLICADA');

      await verificarCupos(userId);

      return SolicitudRepository.create(pasajero_id, userId, userId);
    }

    throw AppError.badRequest('Rol no válido');
  },

  responder: async (solicitudId, userId, estado) => {
    const solicitud = await SolicitudRepository.findById(solicitudId);
    if (!solicitud) throw AppError.notFound('Solicitud no encontrada', 'SOLICITUD_NOT_FOUND');

    const esReceptor = solicitud.iniciado_por != userId
      && (solicitud.conductor_id == userId || solicitud.pasajero_id == userId);

    if (!esReceptor) throw AppError.forbidden(MSG.FORBIDDEN, 'NOT_RECEPTOR');

    // Al aceptar, re-verificar cupos
    if (estado === ESTADOS.ACEPTADA) {
      await verificarCupos(solicitud.conductor_id);
    }

    if (estado === ESTADOS.RECHAZADA) {
      await SolicitudRepository.deleteById(solicitudId);
      return null;
    }

    return SolicitudRepository.updateEstado(solicitudId, estado);
  },

  cancelar: async (solicitudId, userId) => {
    const solicitud = await SolicitudRepository.findById(solicitudId);
    if (!solicitud || solicitud.iniciado_por != userId)
      throw AppError.forbidden('No puedes cancelar esta solicitud', 'NOT_OWNER');

    await SolicitudRepository.deleteById(solicitudId);
  },

  /**
   * Actualizar pickup/destino post-creación (conductor invitó, pasajero agrega sus coords).
   */
  guardarPickup: async (solicitudId, userId, body) => {
    const {
      pickup_lat, pickup_lon,
      pickup_direccion   = '',
      pickup_universidad = '',
      destino_lat        = null,
      destino_lon        = null,
    } = body;

    const pickup_name = pickup_direccion || (await reverseGeocode(pickup_lat, pickup_lon));

    const updated = await SolicitudRepository.updatePickup(solicitudId, userId, {
      pickup_lat, pickup_lon, pickup_name,
      pickup_direccion, pickup_universidad,
      destino_lat, destino_lon,
    });

    if (!updated) throw AppError.notFound('Solicitud no encontrada o sin permiso', 'SOLICITUD_NOT_FOUND');
    return pickup_name;
  },
};
