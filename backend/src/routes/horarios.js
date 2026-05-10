import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// ─── POST / — guardar o actualizar horario ────────────────────────────────────

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { schedule = {}, routes = {}, precio = {} } = req.body;

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
      JSON.stringify(schedule),
      JSON.stringify(routes),
      JSON.stringify(precio),
    ]);

    res.json({ message: 'Horario guardado' });
  } catch (err) { next(err); }
});

// ─── GET /me — obtener horario propio ─────────────────────────────────────────

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT schedule, routes, precio FROM horarios WHERE user_id=$1',
      [req.user.id],
    );

    res.json(rows[0] ?? { schedule: {}, routes: {}, precio: {} });
  } catch (err) { next(err); }
});

export default router;