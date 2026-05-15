import { HorarioRepository }   from '../repositories/horario.repository.js';
import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { UserRepository }      from '../repositories/user.repository.js';
import { calcularPrecioPasajero, calcularResumenConductor } from '../services/price.service.js';
import { asyncHandler }        from '../utils/async-handler.js';
import { ok }                  from '../utils/response.js';
import { AppError }            from '../utils/AppError.js';
import { formatCOP }           from '../utils/format.js';

export const setTarifa = asyncHandler(async (req, res) => {
  const tarifa       = parseFloat(req.body.tarifa_cop_km);
  const precioActual = (await HorarioRepository.findPrecioByUserId(req.user.id)) ?? {};
  await HorarioRepository.upsertPrecio(req.user.id, { ...precioActual, tarifa_cop_km: tarifa });
  ok(res, { tarifa_cop_km: tarifa }, 'Tarifa configurada');
});

export const getTarifa = asyncHandler(async (req, res) => {
  const precio      = (await HorarioRepository.findPrecioByUserId(req.user.id)) ?? {};
  const tarifaCopKm = parseFloat(precio.tarifa_cop_km ?? 0);
  ok(res, { tarifa_cop_km: tarifaCopKm, configurada: tarifaCopKm > 0 }, 'Tarifa obtenida');
});

export const getResumen = asyncHandler(async (req, res) => {
  ok(res, await calcularResumenConductor(req.user.id), 'Resumen obtenido');
});

export const getPrecioPasajero = asyncHandler(async (req, res) => {
  const sol = await SolicitudRepository.findSolicitudConPrecio(
    req.params.solicitudId, req.user.id,
  );
  if (!sol) throw AppError.notFound('Solicitud no encontrada', 'SOLICITUD_NOT_FOUND');

  const tarifaCopKm = parseFloat(sol.conductor_precio?.tarifa_cop_km ?? 0);
  const solicitudId = parseInt(req.params.solicitudId);

  if (!sol.pickup_lat || !sol.pickup_lon || !sol.destino_lat || !sol.destino_lon) {
    return ok(res, {
      solicitud_id: solicitudId, conductor_name: sol.conductor_name,
      tarifaCopKm, distanciaKm: null, precio: null,
    }, 'Aún no has compartido tu ubicación de recogida');
  }

  if (!tarifaCopKm) {
    return ok(res, {
      solicitud_id: solicitudId, conductor_name: sol.conductor_name,
      tarifaCopKm: 0, distanciaKm: null, precio: null,
    }, 'El conductor aún no ha configurado su tarifa');
  }

  const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
    { lat: parseFloat(sol.pickup_lat),  lon: parseFloat(sol.pickup_lon)  },
    { lat: parseFloat(sol.destino_lat), lon: parseFloat(sol.destino_lon) },
    tarifaCopKm,
  );

  ok(res, {
    solicitud_id: solicitudId, conductor_name: sol.conductor_name,
    tarifaCopKm, pickup_direccion: sol.pickup_direccion,
    pickup_universidad: sol.pickup_universidad, distanciaKm, precio: precioPasajero,
  }, `Tu viaje de hoy cuesta ${formatCOP(precioPasajero)}`);
});

export const getTarifaConductor = asyncHandler(async (req, res) => {
  const { pickup_lat, pickup_lon, destino_lat, destino_lon } = req.query;

  const row = await UserRepository.findTarifaConNombre(req.params.conductorId);
  if (!row) throw AppError.notFound('Conductor no encontrado o sin horario', 'HORARIO_NOT_FOUND');

  const tarifaCopKm   = parseFloat(row.precio?.tarifa_cop_km ?? 0);
  const conductorName = row.name;

  if (!tarifaCopKm) {
    return ok(res, {
      conductor_name: conductorName, tarifaCopKm: 0, distanciaKm: null, precioEstimado: null,
    }, 'Este conductor aún no tiene tarifa configurada');
  }

  if (pickup_lat && pickup_lon && destino_lat && destino_lon) {
    const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
      { lat: parseFloat(pickup_lat),  lon: parseFloat(pickup_lon)  },
      { lat: parseFloat(destino_lat), lon: parseFloat(destino_lon) },
      tarifaCopKm,
    );
    return ok(res, {
      conductor_name: conductorName, tarifaCopKm, distanciaKm, precioEstimado: precioPasajero,
    }, `Estimado: ${formatCOP(precioPasajero)}`);
  }

  ok(res, {
    conductor_name: conductorName, tarifaCopKm, distanciaKm: null, precioEstimado: null,
  }, `Tarifa: ${formatCOP(tarifaCopKm)} COP/km`);
});
