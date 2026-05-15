import { pool }      from '../config/db.js';
import { haversine } from '../utils/geo.js';
import { formatCOP } from '../utils/format.js';
import { EXTERNAL }  from '../constants/index.js';

// ─── Distancia vial entre dos puntos usando OSRM ─────────────────────────────

async function roadDistanceKm(from, to) {
  try {
    const url  = `${EXTERNAL.OSRM}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('OSRM sin ruta');
    return parseFloat((data.routes[0].distance / 1000).toFixed(2));
  } catch {
    // Fallback: Haversine × 1.3 (factor de tortuosidad)
    return parseFloat((haversine(from, to) * 1.3).toFixed(2));
  }
}

// ─── Precio de un pasajero ────────────────────────────────────────────────────

/**
 * @param {{ lat, lon }} pickupPoint   Punto de recogida del pasajero
 * @param {{ lat, lon }} destinoPoint  Destino final
 * @param {number}       tarifaCopKm  COP por km que cobra el conductor
 */
export async function calcularPrecioPasajero(pickupPoint, destinoPoint, tarifaCopKm) {
  if (!pickupPoint?.lat  || !pickupPoint?.lon)  throw new Error('pickupPoint inválido');
  if (!destinoPoint?.lat || !destinoPoint?.lon) throw new Error('destinoPoint inválido');
  if (!tarifaCopKm || tarifaCopKm <= 0)         throw new Error('tarifaCopKm debe ser > 0');

  const distanciaKm    = await roadDistanceKm(pickupPoint, destinoPoint);
  const precioPasajero = Math.round((distanciaKm * tarifaCopKm) / 100) * 100;

  return { distanciaKm, precioPasajero };
}

// ─── Resumen total del conductor ──────────────────────────────────────────────

/**
 * Calcula el precio de cada pasajero aceptado hoy y el total del conductor.
 * Pool se importa directamente — no se pasa como parámetro.
 * @param {number} conductorId
 */
export async function calcularResumenConductor(conductorId) {
  const horario = await pool.query(
    'SELECT precio FROM horarios WHERE user_id = $1',
    [conductorId],
  );

  const precioConfig = horario.rows[0]?.precio ?? {};
  const tarifaCopKm  = parseFloat(precioConfig.tarifa_cop_km ?? precioConfig.por_km ?? 0);

  if (!tarifaCopKm || tarifaCopKm <= 0) {
    return {
      tarifaCopKm:    0,
      pasajeros:      [],
      totalConductor: 0,
      totalPasajeros: 0,
      resumen:        'El conductor no tiene tarifa configurada',
    };
  }

  const { rows: solicitudes } = await pool.query(`
    SELECT
      s.id          AS solicitud_id,
      p.id          AS pasajero_id,
      p.name        AS pasajero_name,
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

  const pasajeros = await Promise.all(
    solicitudes.map(async (sol) => {
      const tieneCoordenadas = !!(
        sol.pickup_lat && sol.pickup_lon &&
        sol.destino_lat && sol.destino_lon
      );

      if (!tieneCoordenadas) {
        return {
          solicitud_id:       sol.solicitud_id,
          pasajero_id:        sol.pasajero_id,
          pasajero_name:      sol.pasajero_name,
          pickup_lat:         sol.pickup_lat,
          pickup_lon:         sol.pickup_lon,
          destino_lat:        sol.destino_lat,
          destino_lon:        sol.destino_lon,
          pickup_direccion:   sol.pickup_direccion,
          pickup_universidad: sol.pickup_universidad,
          distanciaKm:        null,
          precio:             null,
          tieneCoordenadas:   false,
        };
      }

      const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
        { lat: parseFloat(sol.pickup_lat),  lon: parseFloat(sol.pickup_lon)  },
        { lat: parseFloat(sol.destino_lat), lon: parseFloat(sol.destino_lon) },
        tarifaCopKm,
      );

      return {
        solicitud_id:       sol.solicitud_id,
        pasajero_id:        sol.pasajero_id,
        pasajero_name:      sol.pasajero_name,
        pickup_lat:         parseFloat(sol.pickup_lat),
        pickup_lon:         parseFloat(sol.pickup_lon),
        destino_lat:        parseFloat(sol.destino_lat),
        destino_lon:        parseFloat(sol.destino_lon),
        pickup_direccion:   sol.pickup_direccion,
        pickup_universidad: sol.pickup_universidad,
        distanciaKm,
        precio:             precioPasajero,
        tieneCoordenadas:   true,
      };
    }),
  );

  const totalConductor = pasajeros.reduce((acc, p) => acc + (p.precio ?? 0), 0);

  return {
    tarifaCopKm,
    pasajeros,
    totalConductor,
    totalPasajeros: pasajeros.length,
    resumen: `${pasajeros.length} pasajero(s) · ${formatCOP(totalConductor)} total`,
  };
}
