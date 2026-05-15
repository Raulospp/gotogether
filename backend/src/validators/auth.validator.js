import { validate, rules } from './common.validator.js';

// ─── Sanitización de entradas ─────────────────────────────────────────────────
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
