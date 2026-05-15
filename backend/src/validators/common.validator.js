import { HTTP } from '../constants/index.js';

// ─── Motor de validación reutilizable ────────────────────────────────────────
/**
 * Crea un middleware que ejecuta un array de funciones-regla.
 * Cada regla recibe (req) y devuelve { field, message } o null.
 */
export function validate(rules) {
  return (req, res, next) => {
    const errors = rules.map(rule => rule(req)).filter(Boolean);
    if (errors.length) {
      return res.status(HTTP.BAD_REQUEST).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors,
      });
    }
    next();
  };
}

// ─── Reglas atómicas reutilizables ───────────────────────────────────────────
export const rules = {
  required:  (field, label)           => (req) => !req.body[field]?.toString().trim()
    ? { field, message: `${label} es requerido` } : null,

  email:     (field = 'email')        => (req) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body[field] ?? '')
    ? { field, message: 'Email inválido' } : null,

  minLength: (field, min, label)      => (req) => (req.body[field]?.length ?? 0) < min
    ? { field, message: `${label} debe tener al menos ${min} caracteres` } : null,

  forbidden: (field, label)           => (req) => req.body[field] !== undefined
    ? { field, message: `No se puede modificar ${label}` } : null,

  isPositiveFloat: (field, label)     => (req) => {
    const v = Number(req.body[field]);
    return (!req.body[field] || isNaN(v) || v <= 0)
      ? { field, message: `${label ?? field} debe ser un número mayor a 0` } : null;
  },
};

// ─── Validación de coordenadas ────────────────────────────────────────────────
/** Valida que un objeto tenga coordenadas lat/lon numéricas. */
export function validateCoords(obj, label = 'punto') {
  if (!obj?.lat || !obj?.lon)
    return `${label} debe incluir { lat, lon }`;
  if (isNaN(parseFloat(obj.lat)) || isNaN(parseFloat(obj.lon)))
    return `${label}: lat y lon deben ser números`;
  return null;
}

// ─── Paginación ───────────────────────────────────────────────────────────────
/** Parsea y valida parámetros de paginación desde req.query */
export function parsePagination(query, defaultLimit = 20) {
  const page   = Math.max(1, parseInt(query.page)  || 1);
  const limit  = Math.min(100, parseInt(query.limit) || defaultLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export const validatePagination = (req, res, next) => {
  const page  = req.query.page  ? Number(req.query.page)  : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  if (!Number.isInteger(page)  || page  < 1)
    return res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'page debe ser un entero positivo' });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    return res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'limit debe ser entre 1 y 100' });
  next();
};
