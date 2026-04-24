import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// ── Iniciar viaje ───────────────────────────────────────────────────────────
router.patch('/:id/iniciar', authMiddleware, async (req, res, next) => {
  try {
    const check = await pool.query(
      `SELECT id FROM solicitudes
       WHERE id = $1 AND conductor_id = $2 AND estado = 'aceptada'`,
      [req.params.id, req.user.id],
    );
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes iniciar este viaje' });

    await pool.query(`UPDATE solicitudes SET estado = 'en_curso' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Viaje iniciado' });
  } catch (err) { next(err); }
});

// ── Finalizar viaje ─────────────────────────────────────────────────────────
router.patch('/:id/finalizar', authMiddleware, async (req, res, next) => {
  try {
    const check = await pool.query(
      `SELECT id FROM solicitudes
       WHERE id = $1 AND conductor_id = $2 AND estado = 'en_curso'`,
      [req.params.id, req.user.id],
    );
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes finalizar este viaje' });

    await pool.query('DELETE FROM solicitudes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Viaje finalizado' });
  } catch (err) { next(err); }
});

// ── Limpiar viajes pasados ──────────────────────────────────────────────────
// ⚠️  Debe estar ANTES de /:id para que Express no lo trate como un param
router.delete('/limpiar-pasados', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM solicitudes WHERE estado = 'aceptada' AND fecha_viaje < CURRENT_DATE RETURNING id`,
    );
    res.json({ message: `${result.rowCount} viajes pasados eliminados` });
  } catch (err) { next(err); }
});

// ── Mis viajes activos ──────────────────────────────────────────────────────
router.get('/mis-viajes', authMiddleware, async (req, res, next) => {
  try {
    const { id: userId, role: userRole } = req.user;
    let result;

    if (userRole === 'conductor') {
      result = await pool.query(`
        SELECT
          s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
          p.id AS pasajero_id, p.name AS pasajero_name,
          p.city AS pasajero_city, p.university AS pasajero_university,
          p.phone AS pasajero_phone,
          COALESCE(h.schedule, '{}') AS schedule,
          COALESCE(h.routes,   '{}') AS routes,
          COALESCE(h.precio,   '{}') AS precio
        FROM solicitudes s
        JOIN users p ON p.id = s.pasajero_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.conductor_id = $1
          AND s.estado IN ('aceptada','en_curso')
          AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at DESC
      `, [userId]);
    } else {
      result = await pool.query(`
        SELECT
          s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
          c.id AS conductor_id, c.name AS conductor_name,
          c.city AS conductor_city, c.car_model, c.plate,
          c.vehicle_type, c.phone AS conductor_phone,
          COALESCE(h.schedule, '{}') AS schedule,
          COALESCE(h.routes,   '{}') AS routes,
          COALESCE(h.precio,   '{}') AS precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.pasajero_id = $1
          AND s.estado IN ('aceptada','en_curso')
          AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at DESC
      `, [userId]);
    }

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── Detalle de un viaje ─────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id: userId, role: userRole } = req.user;
    let result;

    if (userRole === 'conductor') {
      result = await pool.query(`
        SELECT
          s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
          p.id AS pasajero_id, p.name AS pasajero_name,
          p.city AS pasajero_city, p.university AS pasajero_university,
          p.phone AS pasajero_phone,
          COALESCE(h.schedule, '{}') AS schedule,
          COALESCE(h.routes,   '{}') AS routes,
          COALESCE(h.precio,   '{}') AS precio
        FROM solicitudes s
        JOIN users p ON p.id = s.pasajero_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.id = $1 AND s.conductor_id = $2
      `, [req.params.id, userId]);
    } else {
      result = await pool.query(`
        SELECT
          s.id AS solicitud_id, s.estado, s.fecha_viaje, s.created_at,
          c.id AS conductor_id, c.name AS conductor_name,
          c.city AS conductor_city, c.car_model, c.plate,
          c.vehicle_type, c.phone AS conductor_phone,
          COALESCE(h.schedule, '{}') AS schedule,
          COALESCE(h.routes,   '{}') AS routes,
          COALESCE(h.precio,   '{}') AS precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.id = $1 AND s.pasajero_id = $2
      `, [req.params.id, userId]);
    }

    if (result.rows.length === 0) return res.status(404).json({ message: 'Viaje no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


export default router;