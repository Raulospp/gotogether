import { HTTP } from '../constants/index.js';

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
const isValidFloat  = (val, min, max) => val != null && !isNaN(Number(val)) && Number(val) >= min && Number(val) <= max;

export const validateSetTarifa = validate([
  (req) => {
    const v = Number(req.body.tarifa_cop_km);
    return (!req.body.tarifa_cop_km || isNaN(v) || v <= 0)
      ? { field: 'tarifa_cop_km', message: 'tarifa_cop_km debe ser un número mayor a 0' } : null;
  },
]);

export const validateTarifaConductorQuery = validate([
  (req) => !isPositiveInt(req.params.conductorId)
    ? { field: 'conductorId', message: 'conductorId inválido' } : null,
  (req) => req.query.pickup_lat  != null && !isValidFloat(req.query.pickup_lat,  -90,  90)  ? { field: 'pickup_lat',  message: 'pickup_lat inválido'  } : null,
  (req) => req.query.pickup_lon  != null && !isValidFloat(req.query.pickup_lon,  -180, 180) ? { field: 'pickup_lon',  message: 'pickup_lon inválido'  } : null,
  (req) => req.query.destino_lat != null && !isValidFloat(req.query.destino_lat, -90,  90)  ? { field: 'destino_lat', message: 'destino_lat inválido' } : null,
  (req) => req.query.destino_lon != null && !isValidFloat(req.query.destino_lon, -180, 180) ? { field: 'destino_lon', message: 'destino_lon inválido' } : null,
]);
