import { validate, validatePagination } from './common.validator.js';
import { ESTADOS, ROLES }              from '../constants/index.js';

const isPositiveInt = (val) => Number.isInteger(Number(val)) && Number(val) > 0;
const isFloat       = (val, min, max) => !isNaN(Number(val)) && Number(val) >= min && Number(val) <= max;

/**
 * Pasajero: { conductor_id, pickup_lat, pickup_lon, destino_lat, destino_lon, pickup_direccion? }
 * Conductor: { pasajero_id }  (el conductor solo invita, el pasajero pone su punto después)
 */
export const validateCrearSolicitud = validate([
  (req) => {
    const { conductor_id, pasajero_id } = req.body;
    if (conductor_id != null && !isPositiveInt(conductor_id))
      return { field: 'conductor_id', message: 'conductor_id debe ser un entero positivo' };
    if (pasajero_id != null && !isPositiveInt(pasajero_id))
      return { field: 'pasajero_id', message: 'pasajero_id debe ser un entero positivo' };
    return null;
  },
  // Si es pasajero creando solicitud, pickup y destino son obligatorios
  (req) => {
    const { conductor_id, pickup_lat, pickup_lon, destino_lat, destino_lon } = req.body;
    if (!conductor_id) return null; // es conductor invitando → sin coords aún
    if (!isFloat(pickup_lat, -90, 90))
      return { field: 'pickup_lat', message: 'pickup_lat requerido (−90 a 90)' };
    if (!isFloat(pickup_lon, -180, 180))
      return { field: 'pickup_lon', message: 'pickup_lon requerido (−180 a 180)' };
    if (!isFloat(destino_lat, -90, 90))
      return { field: 'destino_lat', message: 'destino_lat requerido (−90 a 90)' };
    if (!isFloat(destino_lon, -180, 180))
      return { field: 'destino_lon', message: 'destino_lon requerido (−180 a 180)' };
    return null;
  },
]);

export const validateResponderSolicitud = validate([
  (req) => !isPositiveInt(req.params.id) ? { field: 'id', message: 'ID de solicitud inválido' } : null,
  (req) => ![ESTADOS.ACEPTADA, ESTADOS.RECHAZADA].includes(req.body.estado)
    ? { field: 'estado', message: 'Estado debe ser aceptada o rechazada' } : null,
]);

export const validateGuardarPickup = validate([
  (req) => !isPositiveInt(req.params.id)
    ? { field: 'id', message: 'ID de solicitud inválido' } : null,
  (req) => !isFloat(req.body.pickup_lat, -90, 90)
    ? { field: 'pickup_lat', message: 'pickup_lat inválido (−90 a 90)' } : null,
  (req) => !isFloat(req.body.pickup_lon, -180, 180)
    ? { field: 'pickup_lon', message: 'pickup_lon inválido (−180 a 180)' } : null,
  (req) => req.body.destino_lat != null && !isFloat(req.body.destino_lat, -90, 90)
    ? { field: 'destino_lat', message: 'destino_lat inválido' } : null,
  (req) => req.body.destino_lon != null && !isFloat(req.body.destino_lon, -180, 180)
    ? { field: 'destino_lon', message: 'destino_lon inválido' } : null,
]);

export const validateSugerirConductores = validate([
  (req) => !req.query.destino?.trim()
    ? { field: 'destino', message: 'El parámetro destino es requerido' } : null,
]);

// Re-exportado desde common para compatibilidad
export { validatePagination };
