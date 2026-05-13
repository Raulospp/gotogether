import { HTTP, ESTADOS } from '../constants/index.js';

function validate(rules) {
  return (req, res, next) => {
    const errors = [];
    for (const rule of rules) {
      const err = rule(req);
      if (err) errors.push(err);
    }
    if (errors.length) {
      return res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'Datos de entrada inválidos', errors });
    }
    next();
  };
}

const isPositiveInt = (val) => Number.isInteger(Number(val)) && Number(val) > 0;
const isValidFloat  = (val, min, max) => !isNaN(Number(val)) && Number(val) >= min && Number(val) <= max;

export const validateCrearSolicitud = validate([
  (req) => {
    const { conductor_id, pasajero_id } = req.body;
    if (conductor_id != null && !isPositiveInt(conductor_id))
      return { field: 'conductor_id', message: 'conductor_id debe ser un entero positivo' };
    if (pasajero_id != null && !isPositiveInt(pasajero_id))
      return { field: 'pasajero_id', message: 'pasajero_id debe ser un entero positivo' };
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
  (req) => !isValidFloat(req.body.pickup_lat, -90, 90)
    ? { field: 'pickup_lat', message: 'pickup_lat inválido (debe estar entre -90 y 90)' } : null,
  (req) => !isValidFloat(req.body.pickup_lon, -180, 180)
    ? { field: 'pickup_lon', message: 'pickup_lon inválido (debe estar entre -180 y 180)' } : null,
  (req) => req.body.destino_lat != null && !isValidFloat(req.body.destino_lat, -90, 90)
    ? { field: 'destino_lat', message: 'destino_lat inválido' } : null,
  (req) => req.body.destino_lon != null && !isValidFloat(req.body.destino_lon, -180, 180)
    ? { field: 'destino_lon', message: 'destino_lon inválido' } : null,
]);

export const validatePagination = (req, res, next) => {
  const page  = req.query.page  ? Number(req.query.page)  : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  if (!Number.isInteger(page)  || page  < 1)        return res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'page debe ser un entero positivo' });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'limit debe ser entre 1 y 100' });
  next();
};
