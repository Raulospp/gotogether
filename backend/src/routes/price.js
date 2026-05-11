import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { ROLES }          from '../constants/index.js';
import {
  calcularPrecioPasajero,
  calcularResumenConductor,
} from '../services/price.service.js';

const router = Router();

router.patch('/tarifa', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CONDUCTOR) {
      return res.status(403).json({ message: 'Solo conductores pueden configurar tarifas' });
    }

    const { tarifa_cop_km } = req.body;
    if (!tarifa_cop_km || isNaN(tarifa_cop_km) || tarifa_cop_km <= 0) {
      return res.status(400).json({ message: 'tarifa_cop_km debe ser un número mayor a 0' });
    }

    
    const actual = await pool.query(
      'SELECT precio FROM horarios WHERE user_id = $1',
      [req.user.id],
    );
    const precioActual = actual.rows[0]?.precio ?? {};

    const nuevoPrecio = {
      ...precioActual,
      tarifa_cop_km: parseFloat(tarifa_cop_km),
    };

    await pool.query(`
      INSERT INTO horarios (user_id, precio, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET precio = $2, updated_at = NOW()
    `, [req.user.id, JSON.stringify(nuevoPrecio)]);

    res.json({
      message:      'Tarifa configurada',
      tarifa_cop_km: parseFloat(tarifa_cop_km),
    });
  } catch (err) { next(err); }
});


router.get('/tarifa', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CONDUCTOR) {
      return res.status(403).json({ message: 'Solo conductores' });
    }

    const result = await pool.query(
      'SELECT precio FROM horarios WHERE user_id = $1',
      [req.user.id],
    );

    const precio       = result.rows[0]?.precio ?? {};
    const tarifaCopKm  = parseFloat(precio.tarifa_cop_km ?? 0);

    res.json({
      tarifa_cop_km: tarifaCopKm,
      configurada:   tarifaCopKm > 0,
    });
  } catch (err) { next(err); }
});


router.get('/resumen', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CONDUCTOR) {
      return res.status(403).json({ message: 'Solo conductores pueden ver el resumen' });
    }

    const resumen = await calcularResumenConductor(req.user.id, pool);
    res.json(resumen);
  } catch (err) { next(err); }
});


router.get('/pasajero/:solicitudId', authMiddleware, async (req, res, next) => {
  try {
    // Buscar la solicitud con sus coordenadas y la tarifa del conductor
    const { rows } = await pool.query(`
      SELECT
        s.id AS solicitud_id,
        s.pickup_lat, s.pickup_lon,
        s.destino_lat, s.destino_lon,
        s.pickup_direccion, s.pickup_universidad,
        h.precio AS conductor_precio,
        c.name AS conductor_name
      FROM solicitudes s
      JOIN users c ON c.id = s.conductor_id
      LEFT JOIN horarios h ON h.user_id = s.conductor_id
      WHERE s.id = $1
        AND s.pasajero_id = $2
    `, [req.params.solicitudId, req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    const sol = rows[0];
    const tarifaCopKm = parseFloat(sol.conductor_precio?.tarifa_cop_km ?? 0);

    // Si no hay coordenadas de pickup aún
    if (!sol.pickup_lat || !sol.pickup_lon || !sol.destino_lat || !sol.destino_lon) {
      return res.json({
        solicitud_id:   parseInt(req.params.solicitudId),
        conductor_name: sol.conductor_name,
        tarifaCopKm,
        distanciaKm:    null,
        precio:         null,
        mensaje:        'Aún no has compartido tu ubicación de recogida',
      });
    }

    // Si el conductor no tiene tarifa configurada
    if (!tarifaCopKm) {
      return res.json({
        solicitud_id:   parseInt(req.params.solicitudId),
        conductor_name: sol.conductor_name,
        tarifaCopKm:    0,
        distanciaKm:    null,
        precio:         null,
        mensaje:        'El conductor aún no ha configurado su tarifa',
      });
    }

    const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
      { lat: parseFloat(sol.pickup_lat),  lon: parseFloat(sol.pickup_lon)  },
      { lat: parseFloat(sol.destino_lat), lon: parseFloat(sol.destino_lon) },
      tarifaCopKm,
    );

    res.json({
      solicitud_id:       parseInt(req.params.solicitudId),
      conductor_name:     sol.conductor_name,
      tarifaCopKm,
      pickup_direccion:   sol.pickup_direccion,
      pickup_universidad: sol.pickup_universidad,
      distanciaKm,
      precio:             precioPasajero,
      mensaje:            `Tu viaje de hoy cuesta $${precioPasajero.toLocaleString('es-CO')} COP`,
    });
  } catch (err) { next(err); }
});


router.get('/conductor/:conductorId/tarifa', authMiddleware, async (req, res, next) => {
  try {
    const { pickup_lat, pickup_lon, destino_lat, destino_lon } = req.query;

    // Tarifa del conductor
    const { rows } = await pool.query(
      `SELECT h.precio, u.name FROM horarios h
       JOIN users u ON u.id = h.user_id
       WHERE h.user_id = $1`,
      [req.params.conductorId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Conductor no encontrado o sin horario' });
    }

    const tarifaCopKm = parseFloat(rows[0]?.precio?.tarifa_cop_km ?? 0);

    if (!tarifaCopKm) {
      return res.json({
        conductor_name: rows[0].name,
        tarifaCopKm:    0,
        distanciaKm:    null,
        precioEstimado: null,
        mensaje:        'Este conductor aún no tiene tarifa configurada',
      });
    }

    // Si el pasajero pasó sus coordenadas, calcular estimación
    if (pickup_lat && pickup_lon && destino_lat && destino_lon) {
      const { distanciaKm, precioPasajero } = await calcularPrecioPasajero(
        { lat: parseFloat(pickup_lat),  lon: parseFloat(pickup_lon)  },
        { lat: parseFloat(destino_lat), lon: parseFloat(destino_lon) },
        tarifaCopKm,
      );

      return res.json({
        conductor_name: rows[0].name,
        tarifaCopKm,
        distanciaKm,
        precioEstimado: precioPasajero,
        mensaje: `Estimado: $${precioPasajero.toLocaleString('es-CO')} COP`,
      });
    }

    // Sin coordenadas → solo devolver la tarifa
    res.json({
      conductor_name: rows[0].name,
      tarifaCopKm,
      distanciaKm:    null,
      precioEstimado: null,
      mensaje:        `Tarifa: $${tarifaCopKm.toLocaleString('es-CO')} COP/km`,
    });
  } catch (err) { next(err); }
});

export default router;