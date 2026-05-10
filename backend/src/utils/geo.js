import { LIMITS } from '../constants/index.js';

// ─── Haversine ────────────────────────────────────────────────────────────────

/** Distancia en km entre dos coordenadas { lat, lon } */
export function haversine(a, b) {
  const R  = 6371;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lon - a.lon) * Math.PI) / 180;

  const x =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ─── Proyección punto → segmento ──────────────────────────────────────────────

function pointToSegment(p, a, b) {
  const dx    = b.lon - a.lon;
  const dy    = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;

  const t = lenSq > 0
    ? Math.max(0, Math.min(1, ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / lenSq))
    : 0;

  const projected = { lat: a.lat + t * dy, lon: a.lon + t * dx };
  return { distKm: haversine(p, projected), projected };
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Verifica si un punto está sobre una polyline dentro de una tolerancia.
 * @param {{ lat, lon }} point
 * @param {Array<{ lat, lon }>} polyline
 * @param {number} toleranceKm
 */
export function isPassengerOnRoute(
  point,
  polyline,
  toleranceKm = LIMITS.GEO_TOLERANCE_KM,
) {
  if (!polyline?.length || polyline.length < 2) {
    return { onRoute: false, closestDistanceKm: Infinity, closestPoint: null };
  }

  let minDist      = Infinity;
  let closestPoint = null;

  for (let i = 0; i < polyline.length - 1; i++) {
    const { distKm, projected } = pointToSegment(point, polyline[i], polyline[i + 1]);
    if (distKm < minDist) {
      minDist      = distKm;
      closestPoint = projected;
    }
  }

  return {
    onRoute:           minDist <= toleranceKm,
    closestDistanceKm: parseFloat(minDist.toFixed(3)),
    closestPoint,
  };
}

/**
 * Devuelve el punto de la polyline más cercano al punto dado.
 * @param {{ lat, lon }} point
 * @param {Array<{ lat, lon }>} polyline
 */
export function findPickupPoint(point, polyline) {
  if (!polyline?.length)     return point;
  if (polyline.length === 1) return polyline[0];

  let minDist = Infinity;
  let best    = polyline[0];

  for (let i = 0; i < polyline.length - 1; i++) {
    const { distKm, projected } = pointToSegment(point, polyline[i], polyline[i + 1]);
    if (distKm < minDist) {
      minDist = distKm;
      best    = projected;
    }
  }

  return best;
}