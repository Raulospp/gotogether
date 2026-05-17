// ─── Roles de usuario ─────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  CONDUCTOR: 'conductor',
  PASAJERO:  'pasajero',
});

// ─── Estados de solicitud/viaje ───────────────────────────────────────────────
export const ESTADOS = Object.freeze({
  PENDIENTE:  'pendiente',
  ACEPTADA:   'aceptada',
  EN_CURSO:   'en_curso',
  RECHAZADA:  'rechazada',
  FINALIZADO: 'finalizado',
});

// ─── Días de la semana ────────────────────────────────────────────────────────
export const DIA_SEMANA = Object.freeze({
  DOMINGO:   0,
  LUNES:     1,
  MARTES:    2,
  MIERCOLES: 3,
  JUEVES:    4,
  VIERNES:   5,
  SABADO:    6,
});

// ─── Configuración de tokens ──────────────────────────────────────────────────
export const TOKEN = Object.freeze({
  ACCESS_TTL:    '15m',
  REFRESH_DAYS:  30,
  REFRESH_BYTES: 64,
});

// ─── Límites del dominio ──────────────────────────────────────────────────────
export const LIMITS = Object.freeze({
  MAX_PASSENGERS:   4,
  BCRYPT_ROUNDS:    10,
  JSON_BODY_LIMIT:  '10kb',
  DB_POOL_MAX:      20,
  DB_IDLE_TIMEOUT:  30_000,
  DB_CONN_TIMEOUT:   5_000,
  DB_MAX_RETRIES:   10,
  DB_RETRY_DELAY:    2_000,
  GEO_TOLERANCE_KM:  0.5,
  GEO_RADIUS_KM:     1.5,
  GEO_ZOOM_STREET:  '17',
  MIN_WORD_LENGTH:   3,
  PAGE_SIZE:        20,
});

// ─── URLs de servicios externos ───────────────────────────────────────────────
export const EXTERNAL = Object.freeze({
  NOMINATIM:  'https://nominatim.openstreetmap.org',
  OSRM:       process.env.OSRM_URL || 'https://router.project-osrm.org',
  USER_AGENT: 'goTogether/1.0 (carpooling universitario Colombia)',
  COUNTRY:    'co',
});

// ─── Valores por defecto del dominio ─────────────────────────────────────────
export const DEFAULTS = Object.freeze({
  VEHICLE_TYPE: 'carro',
  CAPACITY:     4,
});

// ─── Códigos HTTP ─────────────────────────────────────────────────────────────
export const HTTP = Object.freeze({
  OK:            200,
  CREATED:       201,
  BAD_REQUEST:   400,
  UNAUTHORIZED:  401,
  FORBIDDEN:     403,
  NOT_FOUND:     404,
  CONFLICT:      409,
  SERVER_ERROR:  500,
  UNAVAILABLE:   503,
});

// ─── Mensajes de error reutilizables ─────────────────────────────────────────
export const MSG = Object.freeze({
  UNAUTHORIZED:       'No autorizado',
  FORBIDDEN:          'No tienes permiso para realizar esta acción',
  NOT_FOUND:          'Recurso no encontrado',
  SERVER_ERROR:       'Error interno del servidor',
  INVALID_TOKEN:      'Token inválido',
  EXPIRED_TOKEN:      'Token expirado',
  MISSING_TOKEN:      'Token no proporcionado',
  INVALID_CREDS:      'Credenciales inválidas',
  EMAIL_TAKEN:        'El correo ya está registrado',
  NO_FIELDS:          'No hay campos para actualizar',
  ONLY_CONDUCTORES:   'Solo conductores pueden realizar esta acción',
  ONLY_PASAJEROS:     'Solo pasajeros pueden realizar esta acción',
  SIN_CUPOS:          'El conductor no tiene cupos disponibles',
  FRANJA_SOLAPADA:    'Las franjas horarias se solapan',
});
