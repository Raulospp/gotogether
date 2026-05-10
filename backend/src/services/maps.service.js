/**
 * maps.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tres funciones principales adaptadas de Google Maps / Nominatim + OSRM:
 *
 *  1. getCoordinates(address)
 *     Convierte dirección texto → { lat, lon, displayName }
 *     Usa Nominatim (OSM) — sin API key, limitado a Colombia.
 *
 *  2. getRouteWithPassengers(origin, destination, passengerPickups?)
 *     Calcula distancia y tiempo de UNA ruta que puede incluir
 *     hasta 4 paradas de recogida (los 4 pasajeros del conductor).
 *     Devuelve tiempo TOTAL de la ruta completa, no solo origen→destino.
 *     Usa OSRM — sin API key.
 *
 *  3. getSuggestedDrivers(destinationQuery, pool)
 *     Dada la búsqueda del pasajero (ej: "Universidad del Valle"),
 *     devuelve los conductores cuya ruta guardada pasa hacia ese destino.
 *     Matching por:
 *       a) Texto en campo `route` del conductor.
 *       b) Coordenadas: el destino geocodificado cae cerca del
 *          endpoint de la polyline guardada (radio 1.5 km).
 */

import { haversine } from '../utils/geo.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE      = process.env.OSRM_URL || 'https://router.project-osrm.org';
const USER_AGENT     = 'goTogether/1.0 (carpooling universitario Colombia)';

// ── 1. getCoordinates ─────────────────────────────────────────────────────────

/**
 * Convierte una dirección de texto en coordenadas geográficas.
 *
 * @param {string} address  Dirección en texto libre
 * @returns {Promise<{ lat: number, lon: number, displayName: string }>}
 *
 * @throws Error si la dirección no se encontró o Nominatim falló
 *
 * Ejemplo:
 *   await getCoordinates('Universidad del Valle, Cali')
 *   // → { lat: 3.376, lon: -76.534, displayName: 'Universidad del Valle...' }
 */
export async function getCoordinates(address) {
  if (!address?.trim()) throw new Error('address es requerido');

  const params = new URLSearchParams({
    q:              address,
    format:         'json',
    limit:          '1',
    addressdetails: '1',
    countrycodes:   'co',          // restringe a Colombia → mejores resultados
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);

  const data = await res.json();
  if (!data.length) throw new Error(`No se encontró la dirección: "${address}"`);

  return {
    lat:         parseFloat(data[0].lat),
    lon:         parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ── 2. getRouteWithPassengers ─────────────────────────────────────────────────

/**
 * Calcula la ruta completa del conductor incluyendo las paradas de
 * recogida de hasta 4 pasajeros.
 *
 * El orden de waypoints es:
 *   origen → pickup1 → pickup2 → pickup3 → pickup4 → destino final
 *
 * OSRM optimiza el camino vial real — no es línea recta.
 * El tiempo devuelto es el TOTAL del trayecto completo,
 * no solo origen→destino, para reflejar la realidad del conductor.
 *
 * @param {{ lat: number, lon: number }} origin       Punto de partida del conductor
 * @param {{ lat: number, lon: number }} destination  Destino final (ej: universidad)
 * @param {Array<{ lat: number, lon: number }>} passengerPickups
 *        Puntos de recogida de pasajeros (máximo 4). Orden: se recogen en ruta.
 *
 * @returns {Promise<{
 *   distanceKm:      number,   // distancia total de la ruta completa
 *   durationMin:     number,   // tiempo total incluyendo todas las paradas
 *   legs:            Array,    // tiempos por tramo (origen→p1, p1→p2, ...)
 *   waypoints:       Array,    // puntos ordenados usados en el cálculo
 *   polyline:        Array     // array de { lat, lon } para dibujar la ruta
 * }>}
 *
 * Ejemplo (conductor + 2 pasajeros):
 *   await getRouteWithPassengers(
 *     { lat: 10.987, lon: -74.789 },           // origen conductor
 *     { lat: 11.004, lon: -74.807 },           // destino (universidad)
 *     [
 *       { lat: 10.991, lon: -74.793 },         // pickup pasajero 1
 *       { lat: 10.998, lon: -74.800 },         // pickup pasajero 2
 *     ]
 *   )
 *   // → { distanceKm: 4.2, durationMin: 18.5, legs: [...], ... }
 */
export async function getRouteWithPassengers(origin, destination, passengerPickups = []) {
  if (!origin?.lat || !origin?.lon)      throw new Error('origin {lat,lon} requerido');
  if (!destination?.lat || !destination?.lon) throw new Error('destination {lat,lon} requerido');

  const maxPassengers = 4;
  if (passengerPickups.length > maxPassengers) {
    throw new Error(`Máximo ${maxPassengers} pasajeros por viaje`);
  }

  // Construir la secuencia de waypoints:
  // conductor_origin → [pickup1..pickupN] → destination
  const waypoints = [
    origin,
    ...passengerPickups,
    destination,
  ];

  // OSRM espera: lon,lat (orden invertido al estándar)
  const coordString = waypoints
    .map(p => `${p.lon},${p.lat}`)
    .join(';');

  const params = new URLSearchParams({
    overview:   'full',
    geometries: 'geojson',
    steps:      'false',
    annotations:'false',
  });

  const url = `${OSRM_BASE}/route/v1/driving/${coordString}?${params}`;
  const res  = await fetch(url);

  if (!res.ok) throw new Error(`OSRM error ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.message ?? data.code}`);

  const route = data.routes[0];

  // Desglosar tiempos por tramo (leg = segmento entre dos waypoints consecutivos)
  const legs = route.legs.map((leg, i) => {
    const from = i === 0                   ? 'conductor'  : `pasajero_${i}`;
    const to   = i === route.legs.length - 1 ? 'destino' : `pasajero_${i + 1}`;
    return {
      from,
      to,
      distanceKm:  parseFloat((leg.distance / 1000).toFixed(2)),
      durationMin: parseFloat((leg.duration / 60).toFixed(1)),
    };
  });

  // Polyline: GeoJSON devuelve [lon, lat] → invertir a { lat, lon }
  const polyline = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));

  return {
    distanceKm:  parseFloat((route.distance / 1000).toFixed(2)),
    durationMin: parseFloat((route.duration  / 60).toFixed(1)),
    legs,
    waypoints,
    polyline,
  };
}

// ── 3. getSuggestedDrivers ────────────────────────────────────────────────────

/**
 * Sugiere conductores cuya ruta coincide con el destino buscado por el pasajero.
 *
 * Estrategia de matching (ambas se combinan):
 *
 *   A) Texto — el campo `route` del conductor contiene palabras del destino.
 *      Ej: pasajero busca "univalle" → conductor tiene route="Universidad del Valle"
 *
 *   B) Coordenadas — el destino geocodificado está a ≤ radiusKm del
 *      endpoint final de la polyline guardada del conductor.
 *      Garantiza que el conductor VA hacia ese destino (no solo lo nombra).
 *
 * Solo devuelve conductores con cupos disponibles hoy.
 *
 * @param {string} destinationQuery   Lo que escribe el pasajero (ej: "univalle cali")
 * @param {object} pool               Pool de Postgres (de config/db.js)
 * @param {number} [radiusKm=1.5]     Radio en km para matching geográfico
 *
 * @returns {Promise<Array<{
 *   id, name, email, city, car_model, plate, vehicle_type,
 *   capacity, cupos_disponibles, phone,
 *   schedule, routes, precio,
 *   matchType: 'geo' | 'text' | 'both',
 *   distanceToDestinationKm: number | null
 * }>>}
 *
 * Ejemplo:
 *   const drivers = await getSuggestedDrivers('Universidad del Valle', pool);
 *   // → [{name: 'Juan', matchType: 'both', distanceToDestinationKm: 0.3}, ...]
 */
export async function getSuggestedDrivers(destinationQuery, pool, radiusKm = 1.5) {
  if (!destinationQuery?.trim()) throw new Error('destinationQuery es requerido');
  if (!pool)                      throw new Error('pool de DB es requerido');

  // ── A) Obtener coordenadas del destino buscado ────────────────────────────
  let destCoords = null;
  try {
    destCoords = await getCoordinates(destinationQuery);
  } catch {
    // Si no geocodifica, seguimos con matching solo por texto
    console.warn(`⚠️  No se pudo geocodificar "${destinationQuery}" — usando solo matching de texto`);
  }

  // ── B) Obtener conductores activos con su horario/ruta guardados ──────────
  const { rows: drivers } = await pool.query(`
    SELECT
      u.id, u.name, u.email, u.city, u.car_model, u.plate,
      u.vehicle_type, u.capacity, u.phone, u.route AS driver_route_text,
      COALESCE(h.schedule, '{}') AS schedule,
      COALESCE(h.routes,   '{}') AS routes,
      COALESCE(h.precio,   '{}') AS precio,
      u.capacity - COALESCE(
        (SELECT COUNT(*) FROM solicitudes s
         WHERE s.conductor_id = u.id
           AND s.estado = 'aceptada'
           AND s.fecha_viaje = CURRENT_DATE),
        0
      ) AS cupos_disponibles
    FROM users u
    LEFT JOIN horarios h ON h.user_id = u.id
    WHERE u.role = 'conductor'
    ORDER BY u.created_at DESC
  `);

  // ── C) Normaliza texto para comparación insensible a tildes y case ─────────
  const normalize = (str) =>
    (str ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // quita tildes
      .replace(/[^a-z0-9\s]/g, ' ')    // quita símbolos
      .trim();

  const queryNorm = normalize(destinationQuery);
  // Palabras significativas (> 3 letras) para evitar falsos positivos con "de", "la"
  const queryWords = queryNorm.split(/\s+/).filter(w => w.length > 3);

  // ── D) Evaluar cada conductor ──────────────────────────────────────────────
  const results = [];

  for (const driver of drivers) {
    // Descartar conductores sin cupo
    if (parseInt(driver.cupos_disponibles) <= 0) continue;

    let matchText = false;
    let matchGeo  = false;
    let distanceToDestinationKm = null;

    // — Matching textual —
    const driverRouteNorm = normalize(driver.driver_route_text);
    if (queryWords.length > 0) {
      // Al menos la mitad de las palabras deben coincidir
      const matches = queryWords.filter(w => driverRouteNorm.includes(w));
      matchText = matches.length >= Math.ceil(queryWords.length / 2);
    }

    // — Matching geográfico (si tenemos coordenadas del destino) —
    if (destCoords && driver.routes?.polyline?.length >= 2) {
      // El "destino" del conductor es el ÚLTIMO punto de su polyline guardada
      const polyline   = driver.routes.polyline;
      const driverEnd  = polyline[polyline.length - 1];

      distanceToDestinationKm = parseFloat(
        haversine(destCoords, driverEnd).toFixed(2)
      );

      matchGeo = distanceToDestinationKm <= radiusKm;
    }

    // — Solo incluir si hay algún tipo de match —
    if (!matchText && !matchGeo) continue;

    const matchType =
      matchText && matchGeo ? 'both' :
      matchGeo              ? 'geo'  : 'text';

    results.push({
      id:           driver.id,
      name:         driver.name,
      email:        driver.email,
      city:         driver.city,
      car_model:    driver.car_model,
      plate:        driver.plate,
      vehicle_type: driver.vehicle_type,
      capacity:     driver.capacity,
      cupos_disponibles: parseInt(driver.cupos_disponibles),
      phone:        driver.phone,
      schedule:     driver.schedule,
      routes:       driver.routes,
      precio:       driver.precio,
      matchType,
      distanceToDestinationKm,
    });
  }

  // Ordenar: 'both' primero, luego 'geo', luego 'text'
  // Dentro de cada grupo, por distancia ascendente (si está disponible)
  const order = { both: 0, geo: 1, text: 2 };
  results.sort((a, b) => {
    const byMatch = order[a.matchType] - order[b.matchType];
    if (byMatch !== 0) return byMatch;
    if (a.distanceToDestinationKm !== null && b.distanceToDestinationKm !== null) {
      return a.distanceToDestinationKm - b.distanceToDestinationKm;
    }
    return 0;
  });

  return results;
}