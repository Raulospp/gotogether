import { pool }    from '../config/db.js';
import { logger }  from '../config/logger.js';
import { haversine }                              from '../utils/geo.js';
import { normalizeText, metersToKm, secondsToMin } from '../utils/format.js';
import { EXTERNAL, LIMITS }                       from '../constants/index.js';

// ─── Geocodificación ──────────────────────────────────────────────────────────

export async function getCoordinates(address) {
  if (!address?.trim()) throw new Error('address es requerido');

  const params = new URLSearchParams({
    q:              address,
    format:         'json',
    limit:          '1',
    addressdetails: '1',
    countrycodes:   EXTERNAL.COUNTRY,
  });

  const res = await fetch(`${EXTERNAL.NOMINATIM}/search?${params}`, {
    headers: { 'User-Agent': EXTERNAL.USER_AGENT },
  });

  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);

  const data = await res.json();
  if (!data.length) throw new Error(`Dirección no encontrada: "${address}"`);

  return {
    lat:         parseFloat(data[0].lat),
    lon:         parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ─── Cálculo de ruta con pasajeros ───────────────────────────────────────────

export async function getRouteWithPassengers(origin, destination, passengerPickups = []) {
  if (!origin?.lat      || !origin?.lon)      throw new Error('origin {lat,lon} requerido');
  if (!destination?.lat || !destination?.lon) throw new Error('destination {lat,lon} requerido');

  if (passengerPickups.length > LIMITS.MAX_PASSENGERS) {
    throw new Error(`Máximo ${LIMITS.MAX_PASSENGERS} pasajeros por viaje`);
  }

  const waypoints   = [origin, ...passengerPickups, destination];
  const coordString = waypoints.map((p) => `${p.lon},${p.lat}`).join(';');
  const params      = new URLSearchParams({
    overview: 'full', geometries: 'geojson', steps: 'false', annotations: 'false',
  });

  const res = await fetch(`${EXTERNAL.OSRM}/route/v1/driving/${coordString}?${params}`);
  if (!res.ok) throw new Error(`OSRM error ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.message ?? data.code}`);

  const route = data.routes[0];

  const legs = route.legs.map((leg, i) => ({
    from:        i === 0                     ? 'conductor'   : `pasajero_${i}`,
    to:          i === route.legs.length - 1 ? 'destino'     : `pasajero_${i + 1}`,
    distanceKm:  metersToKm(leg.distance),
    durationMin: secondsToMin(leg.duration),
  }));

  const polyline = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));

  return {
    distanceKm:  metersToKm(route.distance),
    durationMin: secondsToMin(route.duration),
    legs,
    waypoints,
    polyline,
  };
}

// ─── Sugerencia de conductores ────────────────────────────────────────────────

function buildDriverResult(driver, matchText, matchGeo, distanceToDestinationKm) {
  const matchType =
    matchText && matchGeo ? 'both' :
    matchGeo              ? 'geo'  : 'text';

  return {
    id:                driver.id,
    name:              driver.name,
    email:             driver.email,
    city:              driver.city,
    car_model:         driver.car_model,
    plate:             driver.plate,
    vehicle_type:      driver.vehicle_type,
    capacity:          driver.capacity,
    cupos_disponibles: parseInt(driver.cupos_disponibles),
    phone:             driver.phone,
    schedule:          driver.schedule,
    routes:            driver.routes,
    precio:            driver.precio,
    matchType,
    distanceToDestinationKm,
  };
}

function matchesByText(driver, queryWords) {
  if (!queryWords.length) return false;
  const driverNorm = normalizeText(driver.driver_route_text);
  const hits       = queryWords.filter((w) => driverNorm.includes(w));
  return hits.length >= Math.ceil(queryWords.length / 2);
}

function matchesByGeo(driver, destCoords, radiusKm) {
  const polyline = driver.routes?.polyline;
  if (!destCoords || !polyline?.length) return { match: false, distance: null };

  const driverEnd = polyline[polyline.length - 1];
  const distance  = parseFloat(haversine(destCoords, driverEnd).toFixed(2));
  return { match: distance <= radiusKm, distance };
}

/**
 * Pool se importa directamente — ya no se pasa como parámetro.
 */
export async function getSuggestedDrivers(destinationQuery, radiusKm = LIMITS.GEO_RADIUS_KM) {
  if (!destinationQuery?.trim()) throw new Error('destinationQuery es requerido');

  let destCoords = null;
  try {
    destCoords = await getCoordinates(destinationQuery);
  } catch {
    logger.warn('No se pudo geocodificar destino', { query: destinationQuery });
  }

  const { rows: drivers } = await pool.query(`
    SELECT
      u.id, u.name, u.email, u.city, u.car_model, u.plate,
      u.vehicle_type, u.capacity, u.phone,
      u.route AS driver_route_text,
      COALESCE(h.schedule, '{}') AS schedule,
      COALESCE(h.routes,   '{}') AS routes,
      COALESCE(h.precio,   '{}') AS precio,
      u.capacity - COALESCE(
        (SELECT COUNT(*) FROM solicitudes s
         WHERE s.conductor_id = u.id AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE),
        0
      ) AS cupos_disponibles
    FROM users u
    LEFT JOIN horarios h ON h.user_id = u.id
    WHERE u.role = 'conductor'
    ORDER BY u.created_at DESC
  `);

  const queryNorm  = normalizeText(destinationQuery);
  const queryWords = queryNorm.split(/\s+/).filter((w) => w.length > LIMITS.MIN_WORD_LENGTH);

  const RANK    = { both: 0, geo: 1, text: 2 };
  const results = [];

  for (const driver of drivers) {
    if (parseInt(driver.cupos_disponibles) <= 0) continue;

    const textMatch = matchesByText(driver, queryWords);
    const geoResult = matchesByGeo(driver, destCoords, radiusKm);

    if (!textMatch && !geoResult.match) continue;

    results.push(buildDriverResult(driver, textMatch, geoResult.match, geoResult.distance));
  }

  results.sort((a, b) => {
    const byRank = RANK[a.matchType] - RANK[b.matchType];
    if (byRank !== 0) return byRank;
    if (a.distanceToDestinationKm != null && b.distanceToDestinationKm != null)
      return a.distanceToDestinationKm - b.distanceToDestinationKm;
    return 0;
  });

  return results;
}
