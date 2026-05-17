import { ViajeRepository }          from '../repositories/viaje.repository.js';
import { SolicitudRepository }      from '../repositories/solicitud.repository.js';
import { calcularResumenConductor } from './price.service.js';
import { getRouteWithPassengers }   from './maps.service.js';
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
      } catch { /* devolver sin precios si falla */ }
    }

    return viajes;
  },

  getById: async (solicitudId, userId, role) => {
    const viaje = await ViajeRepository.findById(solicitudId, userId, role);
    if (!viaje) throw AppError.notFound('Viaje no encontrado', 'VIAJE_NOT_FOUND');
    return viaje;
  },

  /**
   * Ruta consolidada del conductor con todos sus pasajeros activos de hoy.
   * Incluye:
   *   - Lista de pasajeros con pickup y estado
   *   - Ruta OSRM con waypoints en orden de recogida
   *   - Precio por pasajero y total
   */
  getRutaConsolidada: async (conductorId) => {
    const solicitudes = await SolicitudRepository.findPasajerosActivosConductor(conductorId);

    if (!solicitudes.length) {
      return {
        total_pasajeros: 0,
        pasajeros:       [],
        ruta:            null,
        tarifa_cop_km:   null,
        total_conductor: null,
        resumen_precio:  null,
        mensaje:         'No tienes pasajeros aceptados hoy',
      };
    }

    // Calcular precios
    let resumenPrecio = null;
    try { resumenPrecio = await calcularResumenConductor(conductorId); } catch { /* noop */ }
    const precioMap = resumenPrecio
      ? Object.fromEntries(resumenPrecio.pasajeros.map(p => [p.solicitud_id, p]))
      : {};

    // Construir lista enriquecida de pasajeros
    const pasajeros = solicitudes.map(s => ({
      solicitud_id:       s.solicitud_id,
      estado:             s.estado,
      pasajero_id:        s.pasajero_id,
      pasajero_name:      s.pasajero_name,
      pasajero_phone:     s.pasajero_phone,
      pickup_lat:         s.pickup_lat  ? parseFloat(s.pickup_lat)  : null,
      pickup_lon:         s.pickup_lon  ? parseFloat(s.pickup_lon)  : null,
      pickup_name:        s.pickup_name,
      pickup_direccion:   s.pickup_direccion,
      pickup_universidad: s.pickup_universidad,
      destino_lat:        s.destino_lat ? parseFloat(s.destino_lat) : null,
      destino_lon:        s.destino_lon ? parseFloat(s.destino_lon) : null,
      pickup_registrado:  !!(s.pickup_lat && s.pickup_lon),
      precio:             precioMap[s.solicitud_id]?.precio      ?? null,
      distancia_km:       precioMap[s.solicitud_id]?.distanciaKm ?? null,
    }));

    // Calcular ruta OSRM con los pasajeros que ya tienen pickup registrado
    const conPickup = pasajeros.filter(p => p.pickup_registrado);
    const destinoRow = pasajeros.find(p => p.destino_lat && p.destino_lon);

    let ruta = null;
    if (conPickup.length > 0 && destinoRow) {
      try {
        // Origen = primer pickup (proxy hasta que conductor registre su propio origen)
        const [primero, ...resto] = conPickup;
        const origin      = { lat: primero.pickup_lat, lon: primero.pickup_lon };
        const destination = { lat: destinoRow.destino_lat, lon: destinoRow.destino_lon };
        const waypoints   = resto.map(p => ({ lat: p.pickup_lat, lon: p.pickup_lon, name: p.pasajero_name }));

        ruta = await getRouteWithPassengers(origin, destination, waypoints);

        // Anotar qué pasajero corresponde a cada waypoint
        ruta.legs = ruta.legs.map((leg, i) => ({
          ...leg,
          pasajero_name: i < conPickup.length ? conPickup[i].pasajero_name : null,
          solicitud_id:  i < conPickup.length ? conPickup[i].solicitud_id  : null,
        }));
      } catch (err) {
        ruta = { error: err.message };
      }
    }

    return {
      total_pasajeros: pasajeros.length,
      pasajeros,
      ruta,
      tarifa_cop_km:   resumenPrecio?.tarifaCopKm    ?? null,
      total_conductor: resumenPrecio?.totalConductor ?? null,
      resumen_precio:  resumenPrecio?.resumen        ?? null,
    };
  },

  /**
   * El conductor marca a un pasajero como entregado en su destino.
   * Lo elimina de la lista de ruta activa del conductor.
   */
  entregarPasajero: async (solicitudId, conductorId) => {
    const entregado = await SolicitudRepository.marcarPasajeroEntregado(solicitudId, conductorId);
    if (!entregado)
      throw AppError.notFound(
        'Solicitud no encontrada, no pertenece a este conductor o no está en curso',
        'ENTREGA_FORBIDDEN',
      );
    return entregado;
  },
};
