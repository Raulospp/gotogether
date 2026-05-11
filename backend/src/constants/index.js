// ─── Roles de usuario ────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  CONDUCTOR: 'conductor',
  PASAJERO:  'pasajero',
});

// ─── Estados de solicitud/viaje ───────────────────────────────────────────────
export const ESTADOS = Object.freeze({
  PENDIENTE: 'pendiente',
  ACEPTADA:  'aceptada',
  EN_CURSO:  'en_curso',
  RECHAZADA: 'rechazada',
});

// ─── Configuración de tokens ──────────────────────────────────────────────────
export const TOKEN = Object.freeze({
  ACCESS_TTL:    '15m',
  REFRESH_DAYS:  30,
  REFRESH_BYTES: 64,
});

// ─── Límites del dominio ──────────────────────────────────────────────────────
export const LIMITS = Object.freeze({
  MAX_PASSENGERS:    4,
  BCRYPT_ROUNDS:     10,
  JSON_BODY_LIMIT:   '10kb',
  DB_POOL_MAX:       20,
  DB_IDLE_TIMEOUT:   30_000,
  DB_CONN_TIMEOUT:    5_000,
  DB_MAX_RETRIES:    10,
  DB_RETRY_DELAY:     2_000,
  GEO_TOLERANCE_KM:   0.5,
  GEO_RADIUS_KM:      1.5,
  GEO_ZOOM_STREET:   '17',
  MIN_WORD_LENGTH:    3,
});

// ─── URLs de servicios externos ───────────────────────────────────────────────
export const EXTERNAL = Object.freeze({
  NOMINATIM: 'https://nominatim.openstreetmap.org',
  OSRM:      process.env.OSRM_URL || 'https://router.project-osrm.org',
  USER_AGENT:'goTogether/1.0 (carpooling universitario Colombia)',
  COUNTRY:   'co',
});

// ─── Tipo de vehicle por defecto ──────────────────────────────────────────────
export const DEFAULTS = Object.freeze({
  VEHICLE_TYPE: 'carro',
  CAPACITY:     4,
});