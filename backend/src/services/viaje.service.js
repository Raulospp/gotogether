import { ViajeRepository }          from '../repositories/viaje.repository.js';
import { calcularResumenConductor } from './price.service.js';
import { AppError }                 from '../utils/AppError.js';
import { ROLES, ESTADOS }           from '../constants/index.js';

export const ViajeService = {

  iniciar: async (solicitudId, conductorId) => {
    const viaje = await ViajeRepository.findViajeActivo(solicitudId, conductorId, ESTADOS.ACEPTADA);
    if (!viaje) throw AppError.forbidden('No puedes iniciar este viaje', 'VIAJE_FORBIDDEN');
    await ViajeRepository.iniciar(solicitudId);
  },

  finalizar: async (solicitudId, conductorId) => {
    const viaje = await ViajeRepository.findViajeActivo(solicitudId, conductorId, ESTADOS.EN_CURSO);
    if (!viaje) throw AppError.forbidden('No puedes finalizar este viaje', 'VIAJE_FORBIDDEN');
    await ViajeRepository.finalizar(solicitudId);
  },

  limpiarPasados: async () => {
    return ViajeRepository.limpiarPasados();
  },

  getMisViajes: async (userId, role) => {
    const viajes = await ViajeRepository.findMisViajes(userId, role);

    // Enriquecer viajes del conductor con precios por pasajero
    if (role === ROLES.CONDUCTOR && viajes.length > 0) {
      try {
        const resumen   = await calcularResumenConductor(userId);
        const precioMap = Object.fromEntries(resumen.pasajeros.map(p => [p.solicitud_id, p]));
        return viajes.map(v => ({
          ...v,
          precio_pasajero: precioMap[v.solicitud_id]?.precio      ?? null,
          distancia_km:    precioMap[v.solicitud_id]?.distanciaKm ?? null,
          tarifa_cop_km:   resumen.tarifaCopKm,
          total_conductor: resumen.totalConductor,
          resumen_precio:  resumen.resumen,
        }));
      } catch {
        // Si falla el cálculo, devolver viajes sin precios
      }
    }

    return viajes;
  },

  getById: async (solicitudId, userId, role) => {
    const viaje = await ViajeRepository.findById(solicitudId, userId, role);
    if (!viaje) throw AppError.notFound('Viaje no encontrado', 'VIAJE_NOT_FOUND');
    return viaje;
  },
};
