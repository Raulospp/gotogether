import { haversine } from '../utils/geo.js';

const OSRM_BASE = process.env.OSRM_URL || 'https://router.project-osrm.org';

// ── Distancia vial entre dos puntos usando OSRM ───────────────────────────────
async function roadDistanceKm(from, to) {
  try {
    const url = `${OSRM_BASE}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('OSRM sin ruta');
    return parseFloat((data.routes[0].distance / 1000).toFixed(2));
  } catch {
    // Fallback: distancia Haversine (línea recta) × 1.3 (factor de tortuosidad)
    return parseFloat((haversine(from, to) * 1.3).toFixed(2));
  }
}

// ── Calcular precio de UN pasajero ────────────────────────────────────────────
/**
 * @param {{ lat, lon }} pickupPoint   Punto de recogida del pasajero
 * @param {{ lat, lon }} destinoPoint  Destino final
 * @param {number} tarifaCopKm        COP por km que cobra el conductor
 * @returns {Promise<{
 *   distanciaKm: number,
 *   precioPasajero: number,   // COP redondeado a $100
 *   metodo: 'vial' | 'haversine'
 * }>}
 */
export async function calcularPrecioPasajero(pickupPoint, destinoPoint, tarifaCopKm) {
  if (!pickupPoint?.lat || !pickupPoint?.lon) throw new Error('pickupPoint inválido');
  if (!destinoPoint?.lat || !destinoPoint?.lon) throw new Error('destinoPoint inválido');
  if (!tarifaCopKm || tarifaCopKm <= 0) throw new Error('tarifaCopKm debe ser > 0');

  let distanciaKm;
  let metodo = 'vial';

  try {
    distanciaKm = await roadDistanceKm(pickupPoint, destinoPoint);
  } catch {
    distanciaKm = parseFloat((haversine(pickupPoint, destinoPoint) * 1.3).toFixed(2));
    metodo = 'haversine';
  }

  // Redondear al $100 más cercano
  const precioBruto   = distanciaKm * tarifaCopKm;
  const precioPasajero = Math.round(precioBruto / 100) * 100;

  return { distanciaKm, precioPasajero, metodo };
}

// ── Calcular resumen total del conductor ──────────────────────────────────────
/**
 * Dado un conductor, calcula el precio de cada pasajero aceptado hoy
 * y el total que percibirá el conductor por el viaje de hoy.
 *
 * @param {number} conductorId
 * @param {object} pool           Pool de Postgres
 * @returns {Promise<{
 *   tarifaCopKm: number,
 *   pasajeros: Array<{
 *     solicitud_id: number,
 *     pasajero_id: number,
 *     pasajero_name: string,
 *     pickup_lat: number, pickup_lon: number,
 *     destino_lat: number, destino_lon: number,
 *     distanciaKm: number,
 *     precio: number,
 *     tieneCoordenadas: boolean
 *   }>,
 *   totalConductor: number,
 *   totalPasajeros: number,
 *   resumen: string
 * }>}
 */
export async function calcularResumenConductor(conductorId, pool) {
  // 1. Tarifa del conductor desde su horario
  const horario = await pool.query(
    `SELECT precio FROM horarios WHERE user_id = $1`,
    [conductorId],
  );

  const precioConfig = horario.rows[0]?.precio ?? {};
  const tarifaCopKm  = parseFloat(precioConfig.tarifa_cop_km ?? precioConfig.por_km ?? 0);

  if (!tarifaCopKm || tarifaCopKm <= 0) {
    return {
      tarifaCopKm: 0,
      pasajeros: [],
      totalConductor: 0,
      totalPasajeros: 0,
      resumen: 'El conductor no tiene tarifa configurada',
    };
  }

  // 2. Pasajeros aceptados hoy con sus coordenadas de pickup y destino
  const { rows: solicitudes } = await pool.query(`
    SELECT
      s.id AS solicitud_id,
      p.id AS pasajero_id,
      p.name AS pasajero_name,
      s.pickup_lat,  s.pickup_lon,
      s.destino_lat, s.destino_lon,
      s.pickup_direccion, s.pickup_universidad
    FROM solicitudes s
    JOIN users p ON p.id = s.pasajero_id
    WHERE s.conductor_id = $1
      AND s.estado IN ('aceptada', 'en_curso')
      AND s.fecha_viaje = CURRENT_DATE
    ORDER BY s.created_at ASC
  `, [conductorId]);

  // 3. Calcular precio por cada pasajero en paralelo
  const pasajeros = await Promise.all(
    solicitudes.map(async (sol) => {
      const tieneCoordenadas = !!(
        sol.pickup_lat && sol.pickup_lon &&
        sol.destino_lat && sol.destino_lon
      );

      if (!tieneCoordenadas) {
        return {
          solicitud_id:      sol.solicitud_id,
          pasajero_id:       sol.pasajero_id,
          pasajero_name:     sol.pasajero_name,
          pickup_lat:        sol.pickup_lat,
          pickup_lon:        sol.pickup_lon,
          destino_lat:       sol.destino_lat,
          destino_lon:       sol.destino_lon,
          pickup_direccion:  sol.pickup_direccion,
          pickup_universidad:sol.pickup_universidad,
          distanciaKm:       null,
          precio:            null,
          tieneCoordenadas:  false,
        };
      }

      const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
        { lat: parseFloat(sol.pickup_lat),  lon: parseFloat(sol.pickup_lon)  },
        { lat: parseFloat(sol.destino_lat), lon: parseFloat(sol.destino_lon) },
        tarifaCopKm,
      );

      return {
        solicitud_id:      sol.solicitud_id,
        pasajero_id:       sol.pasajero_id,
        pasajero_name:     sol.pasajero_name,
        pickup_lat:        parseFloat(sol.pickup_lat),
        pickup_lon:        parseFloat(sol.pickup_lon),
        destino_lat:       parseFloat(sol.destino_lat),
        destino_lon:       parseFloat(sol.destino_lon),
        pickup_direccion:  sol.pickup_direccion,
        pickup_universidad:sol.pickup_universidad,
        distanciaKm,
        precio:            precioPasajero,
        tieneCoordenadas:  true,
      };
    })
  );

  // 4. Total conductor = suma de precios de pasajeros con coordenadas
  const totalConductor = pasajeros.reduce(
    (acc, p) => acc + (p.precio ?? 0),
    0,
  );

  return {
    tarifaCopKm,
    pasajeros,
    totalConductor,
    totalPasajeros: pasajeros.length,
    resumen: `${pasajeros.length} pasajero(s) · ${formatCOP(totalConductor)} total`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(value);
}