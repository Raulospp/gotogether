import { HorarioRepository }              from '../repositories/horario.repository.js';
import { calcularPrecioPasajero, calcularResumenConductor } from '../services/price.service.js';
import { asyncHandler }                   from '../utils/async-handler.js';
import { ok, fail }                       from '../utils/response.js';
import { AppError }                       from '../utils/AppError.js';
import { ROLES, HTTP }                    from '../constants/index.js';

export const setTarifa = asyncHandler(async (req, res) => {
  const { tarifa_cop_km } = req.body;
  const precioActual  = (await HorarioRepository.findPrecioByUserId(req.user.id)) ?? {};
  const nuevoPrecio   = { ...precioActual, tarifa_cop_km: parseFloat(tarifa_cop_km) };
  await HorarioRepository.upsertPrecio(req.user.id, nuevoPrecio);
  ok(res, { tarifa_cop_km: parseFloat(tarifa_cop_km) }, 'Tarifa configurada');
});

export const getTarifa = asyncHandler(async (req, res) => {
  const precio      = (await HorarioRepository.findPrecioByUserId(req.user.id)) ?? {};
  const tarifaCopKm = parseFloat(precio.tarifa_cop_km ?? 0);
  ok(res, { tarifa_cop_km: tarifaCopKm, configurada: tarifaCopKm > 0 }, 'Tarifa obtenida');
});

export const getResumen = asyncHandler(async (req, res) => {
  const { pool } = await import('../config/db.js');
  ok(res, await calcularResumenConductor(req.user.id, pool), 'Resumen obtenido');
});

export const getPrecioPasajero = asyncHandler(async (req, res) => {
  const { pool } = await import('../config/db.js');
  const { rows } = await pool.query(`
    SELECT s.id AS solicitud_id, s.pickup_lat, s.pickup_lon,
           s.destino_lat, s.destino_lon, s.pickup_direccion, s.pickup_universidad,
           h.precio AS conductor_precio, c.name AS conductor_name
    FROM solicitudes s
    JOIN users c ON c.id = s.conductor_id
    LEFT JOIN horarios h ON h.user_id = s.conductor_id
    WHERE s.id=$1 AND s.pasajero_id=$2
  `, [req.params.solicitudId, req.user.id]);

  if (!rows.length) throw AppError.notFound('Solicitud no encontrada', 'SOLICITUD_NOT_FOUND');

  const sol         = rows[0];
  const tarifaCopKm = parseFloat(sol.conductor_precio?.tarifa_cop_km ?? 0);
  const solicitudId = parseInt(req.params.solicitudId);

  if (!sol.pickup_lat || !sol.pickup_lon || !sol.destino_lat || !sol.destino_lon)
    return ok(res, { solicitud_id: solicitudId, conductor_name: sol.conductor_name, tarifaCopKm, distanciaKm: null, precio: null }, 'Aún no has compartido tu ubicación de recogida');

  if (!tarifaCopKm)
    return ok(res, { solicitud_id: solicitudId, conductor_name: sol.conductor_name, tarifaCopKm: 0, distanciaKm: null, precio: null }, 'El conductor aún no ha configurado su tarifa');

  const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
    { lat: parseFloat(sol.pickup_lat),  lon: parseFloat(sol.pickup_lon)  },
    { lat: parseFloat(sol.destino_lat), lon: parseFloat(sol.destino_lon) },
    tarifaCopKm,
  );

  ok(res, { solicitud_id: solicitudId, conductor_name: sol.conductor_name, tarifaCopKm, pickup_direccion: sol.pickup_direccion, pickup_universidad: sol.pickup_universidad, distanciaKm, precio: precioPasajero },
    `Tu viaje de hoy cuesta $${precioPasajero.toLocaleString('es-CO')} COP`);
});

export const getTarifaConductor = asyncHandler(async (req, res) => {
  const { pool } = await import('../config/db.js');
  const { pickup_lat, pickup_lon, destino_lat, destino_lon } = req.query;

  const { rows } = await pool.query(
    'SELECT h.precio, u.name FROM horarios h JOIN users u ON u.id=h.user_id WHERE h.user_id=$1',
    [req.params.conductorId],
  );
  if (!rows.length) throw AppError.notFound('Conductor no encontrado o sin horario', 'HORARIO_NOT_FOUND');

  const tarifaCopKm = parseFloat(rows[0]?.precio?.tarifa_cop_km ?? 0);
  const conductorName = rows[0].name;

  if (!tarifaCopKm)
    return ok(res, { conductor_name: conductorName, tarifaCopKm: 0, distanciaKm: null, precioEstimado: null }, 'Este conductor aún no tiene tarifa configurada');

  if (pickup_lat && pickup_lon && destino_lat && destino_lon) {
    const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
      { lat: parseFloat(pickup_lat), lon: parseFloat(pickup_lon) },
      { lat: parseFloat(destino_lat), lon: parseFloat(destino_lon) },
      tarifaCopKm,
    );
    return ok(res, { conductor_name: conductorName, tarifaCopKm, distanciaKm, precioEstimado: precioPasajero },
      `Estimado: $${precioPasajero.toLocaleString('es-CO')} COP`);
  }

  ok(res, { conductor_name: conductorName, tarifaCopKm, distanciaKm: null, precioEstimado: null },
    `Tarifa: $${tarifaCopKm.toLocaleString('es-CO')} COP/km`);
});
