import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { reverseGeocode }      from '../utils/routing.js';
import { AppError }            from '../utils/AppError.js';
import { ROLES, ESTADOS, MSG } from '../constants/index.js';

export const SolicitudService = {

  crear: async (userId, role, body) => {
    if (role === ROLES.PASAJERO) {
      const { conductor_id } = body;
      if (!conductor_id) throw AppError.badRequest('conductor_id requerido');

      if (await SolicitudRepository.existeHoy(userId, conductor_id))
        throw AppError.conflict('Ya tienes una solicitud para hoy con este conductor', 'SOLICITUD_DUPLICADA');

      return SolicitudRepository.create(userId, conductor_id, userId);
    }

    if (role === ROLES.CONDUCTOR) {
      const { pasajero_id } = body;
      if (!pasajero_id) throw AppError.badRequest('pasajero_id requerido');

      if (await SolicitudRepository.existeHoy(pasajero_id, userId))
        throw AppError.conflict('Ya enviaste una invitación a este pasajero hoy', 'INVITACION_DUPLICADA');

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
