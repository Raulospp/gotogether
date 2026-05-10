/**
 * utils/geo.js
 * Funciones geométricas puras — sin API keys, sin dependencias externas.
 */

/**
 * Distancia en km entre dos puntos usando la fórmula de Haversine.
 * @param {{ lat: number, lon: number }} a
 * @param {{ lat: number, lon: number }} b
 * @returns {number} distancia en km
 */
export function haversine(a, b) {
  const R  = 6371; // radio de la Tierra en km
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lon - a.lon) * Math.PI) / 180;

  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Proyecta un punto P sobre el segmento AB y devuelve la distancia mínima
 * al segmento (en km) junto con el punto proyectado.
 *
 * @param {{ lat: number, lon: number }} p  Punto a evaluar
 * @param {{ lat: number, lon: number }} a  Inicio del segmento
 * @param {{ lat: number, lon: number }} b  Fin del segmento
 * @returns {{ distKm: number, projected: { lat: number, lon: number } }}
 */
function pointToSegment(p, a, b) {
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t)); // clamp [0, 1]
  }

  const projected = {
    lat: a.lat + t * dy,
    lon: a.lon + t * dx,
  };

  return { distKm: haversine(p, projected), projected };
}

/**
 * Verifica si un punto (pasajero) está sobre la ruta del conductor.
 * Recorre cada segmento de la polyline y busca el más cercano.
 *
 * @param {{ lat: number, lon: number }} point       Ubicación del pasajero
 * @param {Array<{ lat: number, lon: number }>} polyline  Ruta del conductor
 * @param {number} toleranceKm                       Radio de aceptación (default 0.5 km)
 * @returns {{ onRoute: boolean, closestDistanceKm: number, closestPoint: object }}
 */
export function isPassengerOnRoute(point, polyline, toleranceKm = 0.5) {
  if (!polyline?.length || polyline.length < 2) {
    return { onRoute: false, closestDistanceKm: Infinity, closestPoint: null };
  }

  let minDist     = Infinity;
  let closestPoint = null;

  for (let i = 0; i < polyline.length - 1; i++) {
    const { distKm, projected } = pointToSegment(point, polyline[i], polyline[i + 1]);
    if (distKm < minDist) {
      minDist      = distKm;
      closestPoint = projected;
    }
  }

  return {
    onRoute:            minDist <= toleranceKm,
    closestDistanceKm:  parseFloat(minDist.toFixed(3)),
    closestPoint,
  };
}

/**
 * Encuentra el punto exacto sobre la polyline más cercano al pasajero.
 * Es el punto sugerido de recogida antes de hacer snap a la vía real.
 *
 * @param {{ lat: number, lon: number }} point
 * @param {Array<{ lat: number, lon: number }>} polyline
 * @returns {{ lat: number, lon: number }}
 */
export function findPickupPoint(point, polyline) {
  if (!polyline?.length) return point;
  if (polyline.length === 1) return polyline[0];

  let minDist  = Infinity;
  let best     = polyline[0];

  for (let i = 0; i < polyline.length - 1; i++) {
    const { distKm, projected } = pointToSegment(point, polyline[i], polyline[i + 1]);
    if (distKm < minDist) {
      minDist = distKm;
      best    = projected;
    }
  }

  return best;
}