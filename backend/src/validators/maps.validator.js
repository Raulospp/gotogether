import { validate } from './common.validator.js';

const isValidFloat  = (val, min, max) => val != null && !isNaN(Number(val)) && Number(val) >= min && Number(val) <= max;
const isPositiveInt = (val)           => Number.isInteger(Number(val)) && Number(val) > 0;

export const validateSaveRoute = validate([
  (req) => !isValidFloat(req.body.origin?.lat,      -90,  90)  ? { field: 'origin.lat',      message: 'origin.lat inválido'      } : null,
  (req) => !isValidFloat(req.body.origin?.lon,      -180, 180) ? { field: 'origin.lon',      message: 'origin.lon inválido'      } : null,
  (req) => !isValidFloat(req.body.destination?.lat, -90,  90)  ? { field: 'destination.lat', message: 'destination.lat inválido' } : null,
  (req) => !isValidFloat(req.body.destination?.lon, -180, 180) ? { field: 'destination.lon', message: 'destination.lon inválido' } : null,
  (req) => req.body.passengerPickups != null && !Array.isArray(req.body.passengerPickups)
    ? { field: 'passengerPickups', message: 'passengerPickups debe ser un array' } : null,
]);

export const validateValidatePickup = validate([
  (req) => !isPositiveInt(req.body.conductorId)
    ? { field: 'conductorId', message: 'conductorId inválido' } : null,
  (req) => !isValidFloat(req.body.pickupPoint?.lat, -90,  90)
    ? { field: 'pickupPoint.lat', message: 'pickupPoint.lat inválido' } : null,
  (req) => !isValidFloat(req.body.pickupPoint?.lon, -180, 180)
    ? { field: 'pickupPoint.lon', message: 'pickupPoint.lon inválido' } : null,
]);

export const validateSavePickup = validate([
  (req) => !isPositiveInt(req.body.solicitudId)
    ? { field: 'solicitudId', message: 'solicitudId inválido' } : null,
  (req) => !isValidFloat(req.body.pickupLat, -90,  90)
    ? { field: 'pickupLat', message: 'pickupLat inválido' } : null,
  (req) => !isValidFloat(req.body.pickupLon, -180, 180)
    ? { field: 'pickupLon', message: 'pickupLon inválido' } : null,
]);
