import { HorarioRepository }   from '../repositories/horario.repository.js';
import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { getCoordinates, getRouteWithPassengers } from '../services/maps.service.js';
import { FranjaService }                          from '../services/franja.service.js';
import { snapToRoad, reverseGeocode }             from '../utils/routing.js';
import { isPassengerOnRoute, findPickupPoint }    from '../utils/geo.js';
import { asyncHandler }  from '../utils/async-handler.js';
import { ok, fail }      from '../utils/response.js';
import { AppError }      from '../utils/AppError.js';
import { ROLES, LIMITS, HTTP } from '../constants/index.js';

export const geocodeGet = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return fail(res, HTTP.BAD_REQUEST, 'Parámetro q requerido', 'MISSING_PARAM');
  ok(res, await getCoordinates(q), 'Coordenadas obtenidas');
});

export const geocodePost = asyncHandler(async (req, res) => {
  ok(res, await getCoordinates(req.body.address), 'Coordenadas obtenidas');
});

export const saveRoute = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden guardar rutas', 'FORBIDDEN_ROLE');

  const { origin, destination, passengerPickups = [] } = req.body;
  const routeData = await getRouteWithPassengers(origin, destination, passengerPickups);

  await HorarioRepository.upsertRoutes(req.user.id, {
    polyline:    routeData.polyline,
    distanceKm:  routeData.distanceKm,
    durationMin: routeData.durationMin,
    legs:        routeData.legs,
    origin, destination, passengerPickups,
  });

  ok(res, {
    distanceKm:  routeData.distanceKm,
    durationMin: routeData.durationMin,
    legs:        routeData.legs,
    polyline:    routeData.polyline,
  }, 'Ruta guardada');
});

export const getRoute = asyncHandler(async (req, res) => {
  const routes = await HorarioRepository.findRoutesByUserId(req.params.conductorId);
  if (!routes?.polyline)
    throw AppError.notFound('Este conductor no tiene ruta guardada', 'ROUTE_NOT_FOUND');

  const { polyline, distanceKm, durationMin, legs } = routes;
  ok(res, { polyline, distanceKm, durationMin, legs }, 'Ruta obtenida');
});

/**
 * GET /api/maps/conductores-sugeridos?destination=...&radius=...
 *
 * Solo pasajeros. Busca conductores con franja horaria activa HOY cuyo
 * destino coincide con el del pasajero. Devuelve cupos, franja y precio.
 */
export const getSuggestedDriversHandler = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.PASAJERO)
    throw AppError.forbidden('Solo pasajeros pueden buscar conductores', 'FORBIDDEN_ROLE');

  const { destination, radius } = req.query;
  if (!destination)
    return fail(res, HTTP.BAD_REQUEST, 'destination es requerido', 'MISSING_PARAM');

  const radiusKm  = parseFloat(radius) || LIMITS.GEO_RADIUS_KM;
  const conductores = await FranjaService.sugerirConductores(destination, radiusKm);

  ok(res, {
    query:  destination,
    total:  conductores.length,
    drivers: conductores,   // alias legacy mantenido
    conductores,
  }, 'Conductores sugeridos');
});

export const validatePickup = asyncHandler(async (req, res) => {
  const { conductorId, pickupPoint, toleranceKm = LIMITS.GEO_TOLERANCE_KM } = req.body;

  const routes = await HorarioRepository.findRoutesByUserId(conductorId);
  if (!routes?.polyline)
    throw AppError.notFound('El conductor no tiene ruta guardada', 'ROUTE_NOT_FOUND');

  const validation   = isPassengerOnRoute(pickupPoint, routes.polyline, toleranceKm);
  const pickupRaw    = findPickupPoint(pickupPoint, routes.polyline);
  const snappedPoint = await snapToRoad(pickupRaw);

  ok(res, {
    onRoute:           validation.onRoute,
    closestDistanceKm: validation.closestDistanceKm,
    suggestedPickup:   snappedPoint,
  }, 'Validación de pickup completada');
});

export const savePickup = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.PASAJERO)
    throw AppError.forbidden('Solo pasajeros pueden guardar pickups', 'FORBIDDEN_ROLE');

  const { solicitudId, pickupLat, pickupLon } = req.body;
  const pickupName = await reverseGeocode(pickupLat, pickupLon);

  const updated = await SolicitudRepository.updatePickup(solicitudId, req.user.id, {
    pickup_lat: pickupLat, pickup_lon: pickupLon, pickup_name: pickupName,
    pickup_direccion: '', pickup_universidad: '', destino_lat: null, destino_lon: null,
  });

  if (!updated)
    throw AppError.notFound('Solicitud no encontrada o no aceptada', 'SOLICITUD_NOT_FOUND');

  ok(res, { pickupName }, 'Punto de recogida guardado');
});

export const getMyPickup = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden consultar pickups', 'FORBIDDEN_ROLE');

  const pickup = await SolicitudRepository.findPickupBySolicitudAndConductor(
    req.params.solicitudId, req.user.id,
  );
  if (!pickup)
    throw AppError.notFound('Solicitud no encontrada', 'SOLICITUD_NOT_FOUND');

  const { pasajero_name, pasajero_phone, pickup_lat, pickup_lon, pickup_name } = pickup;
  ok(res, {
    pasajero:   pasajero_name,
    phone:      pasajero_phone,
    pickupLat:  pickup_lat,
    pickupLon:  pickup_lon,
    pickupName: pickup_name,
  }, 'Pickup obtenido');
});
