/**
 * routes/maps.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints de mapas y rutas para goTogether.
 *
 * Rutas expuestas:
 *
 *  POST /api/maps/geocode
 *       Convierte dirección texto → coordenadas
 *
 *  POST /api/maps/route
 *       Calcula y guarda la ruta del conductor (con paradas de pasajeros)
 *
 *  GET  /api/maps/route/:conductorId
 *       Devuelve la polyline guardada de un conductor
 *
 *  GET  /api/maps/suggested-drivers
 *       Sugiere conductores que van al destino buscado por el pasajero
 *
 *  POST /api/maps/validate-pickup
 *       Valida que el punto de recogida del pasajero está sobre la ruta
 *
 *  POST /api/maps/save-pickup
 *       Guarda el punto de recogida del pasajero en la solicitud
 *
 *  GET  /api/maps/my-pickup/:solicitudId
 *       El conductor consulta el punto de recogida de un pasajero aceptado
 */

import { Router }            from 'express';
import { pool }              from '../config/db.js';
import { authMiddleware }    from '../middlewares/auth.js';
import {
  getCoordinates,
  getRouteWithPassengers,
  getSuggestedDrivers,
}                            from '../services/maps.service.js';
import { snapToRoad }        from '../services/routing.js';
import {
  isPassengerOnRoute,
  findPickupPoint,
}                            from '../utils/geo.js';

const router = Router();

// ── POST /api/maps/geocode ────────────────────────────────────────────────────
// Convierte dirección texto en coordenadas.
// Body: { "address": "Universidad del Norte, Barranquilla" }
// Respuesta: { lat, lon, displayName }
router.post('/geocode', authMiddleware, async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ message: 'address requerido' });

    const result = await getCoordinates(address);
    res.json(result);
  } catch (err) { next(err); }
});

// ── POST /api/maps/route ──────────────────────────────────────────────────────
// El conductor calcula y guarda su ruta con (opcionalmente) los pickups
// de sus pasajeros ya aceptados. El tiempo devuelto es el TOTAL del recorrido.
//
// Body:
// {
//   "origin":      { "lat": 10.987, "lon": -74.789 },
//   "destination": { "lat": 11.004, "lon": -74.807 },
//   "passengerPickups": [           ← opcional, máx 4
//     { "lat": 10.991, "lon": -74.793 },
//     { "lat": 10.998, "lon": -74.800 }
//   ]
// }
router.post('/route', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'conductor') {
      return res.status(403).json({ message: 'Solo conductores pueden guardar rutas' });
    }

    const { origin, destination, passengerPickups = [] } = req.body;

    if (!origin?.lat || !origin?.lon) {
      return res.status(400).json({ message: 'origin { lat, lon } requerido' });
    }
    if (!destination?.lat || !destination?.lon) {
      return res.status(400).json({ message: 'destination { lat, lon } requerido' });
    }
    if (!Array.isArray(passengerPickups)) {
      return res.status(400).json({ message: 'passengerPickups debe ser un array' });
    }

    const routeData = await getRouteWithPassengers(origin, destination, passengerPickups);

    // Persistir en la columna routes de horarios
    await pool.query(`
      INSERT INTO horarios (user_id, routes, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET routes = $2, updated_at = NOW()
    `, [
      req.user.id,
      JSON.stringify({
        polyline:        routeData.polyline,
        distanceKm:      routeData.distanceKm,
        durationMin:     routeData.durationMin,
        legs:            routeData.legs,
        origin,
        destination,
        passengerPickups,
      }),
    ]);

    res.json({
      message:     'Ruta guardada',
      distanceKm:  routeData.distanceKm,
      durationMin: routeData.durationMin,
      legs:        routeData.legs,
      polyline:    routeData.polyline,
    });
  } catch (err) { next(err); }
});

// ── GET /api/maps/route/:conductorId ─────────────────────────────────────────
// Devuelve la ruta guardada de un conductor (solo polyline, distancia y tiempo).
// El pasajero usa esto para ver por dónde pasa el conductor.
router.get('/route/:conductorId', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT routes FROM horarios WHERE user_id = $1',
      [req.params.conductorId],
    );

    if (!result.rows.length || !result.rows[0].routes?.polyline) {
      return res.status(404).json({ message: 'Este conductor no tiene ruta guardada' });
    }

    const { polyline, distanceKm, durationMin, legs } = result.rows[0].routes;
    res.json({ polyline, distanceKm, durationMin, legs });
  } catch (err) { next(err); }
});

// ── GET /api/maps/suggested-drivers ──────────────────────────────────────────
// Devuelve conductores cuya ruta va hacia el destino del pasajero.
//
// Query params:
//   destination  (string, requerido) — ej: "Universidad del Valle, Cali"
//   radius       (number, opcional)  — radio en km para match geográfico (default 1.5)
//
// Respuesta: array ordenado por relevancia (both > geo > text)
// Cada conductor incluye: matchType, distanceToDestinationKm, cupos_disponibles
router.get('/suggested-drivers', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'pasajero') {
      return res.status(403).json({ message: 'Solo pasajeros pueden buscar conductores' });
    }

    const { destination, radius } = req.query;
    if (!destination) {
      return res.status(400).json({ message: 'destination es requerido' });
    }

    const radiusKm  = parseFloat(radius) || 1.5;
    const drivers   = await getSuggestedDrivers(destination, pool, radiusKm);

    res.json({
      query:   destination,
      total:   drivers.length,
      drivers,
    });
  } catch (err) { next(err); }
});

// ── POST /api/maps/validate-pickup ───────────────────────────────────────────
// Verifica si el punto del pasajero está sobre la ruta del conductor.
// Body:
// {
//   "conductorId": 5,
//   "pickupPoint": { "lat": 10.993, "lon": -74.797 },
//   "toleranceKm": 0.5   ← opcional (default 0.5 km = 500 metros)
// }
router.post('/validate-pickup', authMiddleware, async (req, res, next) => {
  try {
    const { conductorId, pickupPoint, toleranceKm = 0.5 } = req.body;

    if (!conductorId || !pickupPoint?.lat || !pickupPoint?.lon) {
      return res.status(400).json({ message: 'conductorId y pickupPoint { lat, lon } requeridos' });
    }

    const result = await pool.query(
      'SELECT routes FROM horarios WHERE user_id = $1',
      [conductorId],
    );

    if (!result.rows.length || !result.rows[0].routes?.polyline) {
      return res.status(404).json({ message: 'El conductor no tiene ruta guardada' });
    }

    const { polyline } = result.rows[0].routes;

    const validation   = isPassengerOnRoute(pickupPoint, polyline, toleranceKm);
    const pickupRaw    = findPickupPoint(pickupPoint, polyline);
    const snappedPoint = await snapToRoad(pickupRaw);

    res.json({
      onRoute:           validation.onRoute,
      closestDistanceKm: validation.closestDistanceKm,
      suggestedPickup: {
        lat:  snappedPoint.lat,
        lon:  snappedPoint.lon,
        name: snappedPoint.name,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/maps/save-pickup ────────────────────────────────────────────────
// El pasajero guarda su punto de recogida en la solicitud aceptada.
// Body: { "solicitudId": 5, "pickupLat": 10.993, "pickupLon": -74.797 }
router.post('/save-pickup', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'pasajero') {
      return res.status(403).json({ message: 'Solo pasajeros pueden guardar puntos de recogida' });
    }

    const { solicitudId, pickupLat, pickupLon } = req.body;
    if (!solicitudId || pickupLat == null || pickupLon == null) {
      return res.status(400).json({ message: 'solicitudId, pickupLat y pickupLon requeridos' });
    }

    // Reverse geocoding para obtener nombre legible del punto
    let pickupName = '';
    try {
      const params = new URLSearchParams({ lat: pickupLat, lon: pickupLon, format: 'json' });
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        headers: { 'User-Agent': 'goTogether/1.0' },
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        pickupName = geoData.display_name ?? '';
      }
    } catch { /* no es crítico */ }

    const updated = await pool.query(`
      UPDATE solicitudes
      SET pickup_lat = $1, pickup_lon = $2, pickup_name = $3
      WHERE id = $4 AND pasajero_id = $5 AND estado = 'aceptada'
      RETURNING id
    `, [pickupLat, pickupLon, pickupName, solicitudId, req.user.id]);

    if (!updated.rows.length) {
      return res.status(404).json({ message: 'Solicitud no encontrada o no aceptada' });
    }

    res.json({ message: 'Punto de recogida guardado', pickupName });
  } catch (err) { next(err); }
});

// ── GET /api/maps/my-pickup/:solicitudId ─────────────────────────────────────
// El conductor consulta el punto de recogida de UN pasajero aceptado.
// Solo el conductor de esa solicitud puede verlo.
router.get('/my-pickup/:solicitudId', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'conductor') {
      return res.status(403).json({ message: 'Solo conductores pueden consultar pickups' });
    }

    const result = await pool.query(`
      SELECT s.pickup_lat, s.pickup_lon, s.pickup_name,
             p.name AS pasajero_name, p.phone AS pasajero_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      WHERE s.id = $1
        AND s.conductor_id = $2
        AND s.estado = 'aceptada'
    `, [req.params.solicitudId, req.user.id]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    const row = result.rows[0];
    res.json({
      pasajero:   row.pasajero_name,
      phone:      row.pasajero_phone,
      pickupLat:  row.pickup_lat,
      pickupLon:  row.pickup_lon,
      pickupName: row.pickup_name,
    });
  } catch (err) { next(err); }
});

export default router;