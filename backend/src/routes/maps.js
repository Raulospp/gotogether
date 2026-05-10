import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { requireCoords }  from '../middlewares/validate.js';
import {
  getCoordinates,
  getRouteWithPassengers,
  getSuggestedDrivers,
}                         from '../services/maps.service.js';
import { snapToRoad, reverseGeocode } from '../services/routing.js';
import { isPassengerOnRoute, findPickupPoint } from '../utils/geo.js';
import { ROLES, ESTADOS, LIMITS }    from '../constants/index.js';

const router = Router();

// ─── GET /geocode (alias sin auth para compatibilidad con MapaViaje.vue) ──────

router.get('/geocode', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ message: 'Parámetro q requerido' });
    const result = await getCoordinates(String(q));
    res.json(result);
  } catch (err) { next(err); }
});

// ─── POST /geocode (con auth, desde el frontend autenticado) ──────────────────

router.post('/geocode', authMiddleware, async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ message: 'address requerido' });
    res.json(await getCoordinates(address));
  } catch (err) { next(err); }
});

// ─── POST /route ──────────────────────────────────────────────────────────────

router.post('/route', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CONDUCTOR) {
      return res.status(403).json({ message: 'Solo conductores pueden guardar rutas' });
    }

    const { origin, destination, passengerPickups = [] } = req.body;

    const errOrigin = requireCoords(origin, 'origin');
    if (errOrigin) return res.status(400).json({ message: errOrigin });

    const errDest = requireCoords(destination, 'destination');
    if (errDest) return res.status(400).json({ message: errDest });

    if (!Array.isArray(passengerPickups)) {
      return res.status(400).json({ message: 'passengerPickups debe ser un array' });
    }

    const routeData = await getRouteWithPassengers(origin, destination, passengerPickups);

    await pool.query(`
      INSERT INTO horarios (user_id, routes, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET routes=$2, updated_at=NOW()
    `, [req.user.id, JSON.stringify({
      polyline: routeData.polyline, distanceKm: routeData.distanceKm,
      durationMin: routeData.durationMin, legs: routeData.legs,
      origin, destination, passengerPickups,
    })]);

    res.json({
      message:     'Ruta guardada',
      distanceKm:  routeData.distanceKm,
      durationMin: routeData.durationMin,
      legs:        routeData.legs,
      polyline:    routeData.polyline,
    });
  } catch (err) { next(err); }
});

// ─── GET /route/:conductorId ──────────────────────────────────────────────────

router.get('/route/:conductorId', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT routes FROM horarios WHERE user_id=$1',
      [req.params.conductorId],
    );

    if (!rows.length || !rows[0].routes?.polyline) {
      return res.status(404).json({ message: 'Este conductor no tiene ruta guardada' });
    }

    const { polyline, distanceKm, durationMin, legs } = rows[0].routes;
    res.json({ polyline, distanceKm, durationMin, legs });
  } catch (err) { next(err); }
});

// ─── GET /suggested-drivers ───────────────────────────────────────────────────

router.get('/suggested-drivers', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.PASAJERO) {
      return res.status(403).json({ message: 'Solo pasajeros pueden buscar conductores' });
    }

    const { destination, radius } = req.query;
    if (!destination) return res.status(400).json({ message: 'destination es requerido' });

    const radiusKm = parseFloat(radius) || LIMITS.GEO_RADIUS_KM;
    const drivers  = await getSuggestedDrivers(destination, pool, radiusKm);

    res.json({ query: destination, total: drivers.length, drivers });
  } catch (err) { next(err); }
});

// ─── POST /validate-pickup ────────────────────────────────────────────────────

router.post('/validate-pickup', authMiddleware, async (req, res, next) => {
  try {
    const { conductorId, pickupPoint, toleranceKm = LIMITS.GEO_TOLERANCE_KM } = req.body;

    if (!conductorId || !pickupPoint?.lat || !pickupPoint?.lon) {
      return res.status(400).json({ message: 'conductorId y pickupPoint {lat,lon} requeridos' });
    }

    const { rows } = await pool.query(
      'SELECT routes FROM horarios WHERE user_id=$1',
      [conductorId],
    );

    if (!rows.length || !rows[0].routes?.polyline) {
      return res.status(404).json({ message: 'El conductor no tiene ruta guardada' });
    }

    const { polyline }   = rows[0].routes;
    const validation     = isPassengerOnRoute(pickupPoint, polyline, toleranceKm);
    const pickupRaw      = findPickupPoint(pickupPoint, polyline);
    const snappedPoint   = await snapToRoad(pickupRaw);

    res.json({
      onRoute:           validation.onRoute,
      closestDistanceKm: validation.closestDistanceKm,
      suggestedPickup:   snappedPoint,
    });
  } catch (err) { next(err); }
});

// ─── POST /save-pickup ────────────────────────────────────────────────────────

router.post('/save-pickup', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.PASAJERO) {
      return res.status(403).json({ message: 'Solo pasajeros pueden guardar pickups' });
    }

    const { solicitudId, pickupLat, pickupLon } = req.body;
    if (!solicitudId || pickupLat == null || pickupLon == null) {
      return res.status(400).json({ message: 'solicitudId, pickupLat y pickupLon requeridos' });
    }

    const pickupName = await reverseGeocode(pickupLat, pickupLon);

    const { rows } = await pool.query(`
      UPDATE solicitudes SET pickup_lat=$1, pickup_lon=$2, pickup_name=$3
      WHERE id=$4 AND pasajero_id=$5 AND estado='${ESTADOS.ACEPTADA}'
      RETURNING id
    `, [pickupLat, pickupLon, pickupName, solicitudId, req.user.id]);

    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada o no aceptada' });

    res.json({ message: 'Punto de recogida guardado', pickupName });
  } catch (err) { next(err); }
});

// ─── GET /my-pickup/:solicitudId ─────────────────────────────────────────────

router.get('/my-pickup/:solicitudId', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CONDUCTOR) {
      return res.status(403).json({ message: 'Solo conductores pueden consultar pickups' });
    }

    const { rows } = await pool.query(`
      SELECT s.pickup_lat, s.pickup_lon, s.pickup_name,
             p.name AS pasajero_name, p.phone AS pasajero_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      WHERE s.id=$1 AND s.conductor_id=$2 AND s.estado='${ESTADOS.ACEPTADA}'
    `, [req.params.solicitudId, req.user.id]);

    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const row = rows[0];
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