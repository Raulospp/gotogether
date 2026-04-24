import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// ── Guardar / actualizar horario ────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { schedule, routes, precio } = req.body;

    await pool.query(`
      INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET schedule   = $2,
            routes     = $3,
            precio     = $4,
            updated_at = NOW()
    `, [
      req.user.id,
      JSON.stringify(schedule || {}),
      JSON.stringify(routes   || {}),
      JSON.stringify(precio   || {}),
    ]);

    res.json({ message: 'Horario guardado' });
  } catch (err) { next(err); }
});

// ── Obtener horario propio ──────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT schedule, routes, precio FROM horarios WHERE user_id = $1',
      [req.user.id],
    );
    if (result.rows.length === 0) return res.json({ schedule: {}, routes: {}, precio: {} });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

export default router;