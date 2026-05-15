
export function userShape(u) {
  return {
    id:           u.id,
    name:         u.name,
    email:        u.email,
    role:         u.role,
    city:         u.city,
    university:   u.university,
    car_model:    u.car_model,
    plate:        u.plate,
    route:        u.route,
    vehicle_type: u.vehicle_type,
    capacity:     u.capacity,
    phone:        u.phone,
  };
}

// ─── Normalización de texto para comparaciones geográficas ───────────────────
export function normalizeText(str) {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')   // quitar símbolos
    .trim();
}

// ─── Convertir metros → km redondeado ────────────────────────────────────────
export const metersToKm  = (m) => parseFloat((m / 1000).toFixed(2));
export const secondsToMin = (s) => parseFloat((s / 60).toFixed(1));

// ─── Redondear COP al $100 más cercano ───────────────────────────────────────
export const roundCOP = (value) => Math.round(value / 100) * 100;
// ─── Formateo monetario COP ───────────────────────────────────────────────────
/** Formatea un valor numérico como moneda COP: $1.500 */
export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style:                 'currency',
    currency:              'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
