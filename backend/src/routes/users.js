import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// ── Listar conductores ──────────────────────────────────────────────────────
router.get('/conductores', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes,   '{}') AS routes,
        COALESCE(h.precio,   '{}') AS precio,
        u.capacity - COALESCE(
          (SELECT COUNT(*) FROM solicitudes s
           WHERE s.conductor_id = u.id AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE),
          0
        ) AS cupos_disponibles,
        EXISTS(
          SELECT 1 FROM solicitudes s
          WHERE s.conductor_id = u.id AND s.pasajero_id = $2
          AND s.estado IN ('pendiente','aceptada') AND s.fecha_viaje = CURRENT_DATE
        ) AS ya_solicitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['conductor', req.user.id]);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── Listar pasajeros ────────────────────────────────────────────────────────
router.get('/pasajeros', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.university, u.phone,
        COALESCE(h.schedule, '{}') AS schedule,
        EXISTS(
          SELECT 1 FROM solicitudes s
          WHERE s.pasajero_id = u.id AND s.conductor_id = $2
          AND s.estado IN ('pendiente','aceptada') AND s.fecha_viaje = CURRENT_DATE
        ) AS ya_invitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['pasajero', req.user.id]);

    res.json(result.rows);
  } catch (err) { next(err); }
});

export default router;