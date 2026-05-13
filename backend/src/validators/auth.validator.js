import { HTTP } from '../constants/index.js';

// ─── Helper central: responde si hay errores, si no llama next() ──────────────
function validate(rules) {
  return (req, res, next) => {
    const errors = [];
    for (const rule of rules) {
      const err = rule(req);
      if (err) errors.push(err);
    }
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

// ─── Reglas reutilizables ─────────────────────────────────────────────────────
const rules = {
  required:  (field, label) => (req) => !req.body[field]?.toString().trim()  ? { field, message: `${label} es requerido` }       : null,
  email:     (field = 'email')        => (req) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body[field] ?? '') ? { field, message: 'Email inválido' } : null,
  minLength: (field, min, label)      => (req) => (req.body[field]?.length ?? 0) < min ? { field, message: `${label} debe tener al menos ${min} caracteres` } : null,
  isInt:     (field, label)           => (req) => req.body[field] != null && !Number.isInteger(Number(req.body[field])) ? { field, message: `${field} debe ser un entero` } : null,
  forbidden: (field, label)           => (req) => req.body[field] !== undefined ? { field, message: `No se puede modificar ${label}` } : null,
  isFloat:   (field, min, max, label) => (req) => req.body[field] != null && (isNaN(Number(req.body[field])) || Number(req.body[field]) < min || Number(req.body[field]) > max)
    ? { field, message: `${label ?? field} debe ser un número entre ${min} y ${max}` } : null,
  isPositiveFloat: (field, label)     => (req) => {
    const v = Number(req.body[field]);
    return (!req.body[field] || isNaN(v) || v <= 0) ? { field, message: `${label} debe ser un número mayor a 0` } : null;
  },
};

// ─── Sanitización inline ──────────────────────────────────────────────────────
function sanitize(req) {
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.name)  req.body.name  = req.body.name.trim();
  if (req.body.city)  req.body.city  = req.body.city.trim();
}

function withSanitize(middleware) {
  return (req, res, next) => { sanitize(req); middleware(req, res, next); };
}

// ─── Schemas exportados ───────────────────────────────────────────────────────

export const validateRegisterConductor = withSanitize(validate([
  rules.required('name',      'El nombre'),
  rules.email(),
  rules.minLength('password', 8, 'La contraseña'),
  rules.required('city',      'La ciudad'),
  rules.required('car_model', 'El modelo del vehículo'),
  rules.required('plate',     'La placa'),
]));

export const validateRegisterPasajero = withSanitize(validate([
  rules.required('name',       'El nombre'),
  rules.email(),
  rules.minLength('password',  8, 'La contraseña'),
  rules.required('city',       'La ciudad'),
  rules.required('university', 'La universidad'),
]));

export const validateLogin = withSanitize(validate([
  rules.email(),
  rules.required('password', 'La contraseña'),
]));

export const validateUpdateProfile = validate([
  rules.forbidden('email', 'el email'),
  rules.forbidden('role',  'el rol'),
  (req) => req.body.password != null && (req.body.password?.length ?? 0) < 8
    ? { field: 'password', message: 'La contraseña debe tener al menos 8 caracteres' } : null,
]);
