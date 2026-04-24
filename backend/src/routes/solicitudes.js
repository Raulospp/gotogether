import { Router }        from 'express';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// ── Crear solicitud / invitación ────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { conductor_id, pasajero_id }   = req.body;
    const { id: userId, role: userRole }  = req.user;

    if (userRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });

      const existe = await pool.query(
        `SELECT id FROM solicitudes
         WHERE pasajero_id = $1 AND conductor_id = $2
         AND estado IN ('pendiente','aceptada') AND fecha_viaje = CURRENT_DATE`,
        [userId, conductor_id],
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ message: 'Ya tienes una solicitud para hoy con este conductor' });
      }

      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje) VALUES ($1,$2,$3,CURRENT_DATE) RETURNING *',
        [userId, conductor_id, userId],
      );
      return res.status(201).json({ message: 'Solicitud enviada', solicitud: result.rows[0] });
    }

    if (userRole === 'conductor') {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });

      const existe = await pool.query(
        `SELECT id FROM solicitudes
         WHERE pasajero_id = $1 AND conductor_id = $2
         AND estado IN ('pendiente','aceptada') AND fecha_viaje = CURRENT_DATE`,
        [pasajero_id, userId],
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ message: 'Ya enviaste una invitación a este pasajero hoy' });
      }

      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje) VALUES ($1,$2,$3,CURRENT_DATE) RETURNING *',
        [pasajero_id, userId, userId],
      );
      return res.status(201).json({ message: 'Invitación enviada', solicitud: result.rows[0] });
    }

    res.status(400).json({ message: 'Rol no válido' });
  } catch (err) { next(err); }
});

// ── Conteo de pendientes ────────────────────────────────────────────────────
router.get('/pendientes-count', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM solicitudes
       WHERE iniciado_por != $1
         AND (conductor_id = $1 OR pasajero_id = $1)
         AND estado = 'pendiente'`,
      [req.user.id],
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) { next(err); }
});

// ── Mis solicitudes ─────────────────────────────────────────────────────────
router.get('/mis-solicitudes', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id, s.estado, s.created_at, s.iniciado_por,
        s.pasajero_id, s.conductor_id,
        p.name  AS pasajero_name,
        p.city  AS pasajero_city,
        p.university AS pasajero_university,
        p.phone AS pasajero_phone,
        c.name  AS conductor_name,
        c.city  AS conductor_city,
        c.car_model, c.vehicle_type,
        c.phone AS conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE s.pasajero_id = $1 OR s.conductor_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── Aceptar / rechazar solicitud ────────────────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
    }

    const solicitud = await pool.query('SELECT * FROM solicitudes WHERE id = $1', [req.params.id]);
    if (solicitud.rows.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const sol        = solicitud.rows[0];
    const esReceptor = sol.iniciado_por != req.user.id
      && (sol.conductor_id == req.user.id || sol.pasajero_id == req.user.id);

    if (!esReceptor) return res.status(403).json({ message: 'No tienes permiso' });

    if (estado === 'rechazada') {
      await pool.query('DELETE FROM solicitudes WHERE id = $1', [req.params.id]);
      return res.json({ message: 'Solicitud rechazada y eliminada' });
    }

    const result = await pool.query(
      'UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, req.params.id],
    );
    res.json({ message: 'Solicitud aceptada', solicitud: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Cancelar solicitud ──────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const check = await pool.query(
      'SELECT id FROM solicitudes WHERE id = $1 AND iniciado_por = $2',
      [req.params.id, req.user.id],
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'No puedes cancelar esta solicitud' });
    }
    await pool.query('DELETE FROM solicitudes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) { next(err); }
});

export default router;