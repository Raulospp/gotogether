import { Router }          from 'express';
import { pool }             from '../config/db.js';
import { authMiddleware }   from '../middlewares/auth.js';
import { reverseGeocode }   from '../services/routing.js';
import { ROLES, ESTADOS }   from '../constants/index.js';

const router = Router();

// ─── Helpers locales ──────────────────────────────────────────────────────────

async function solicitudExiste(pasajeroId, conductorId) {
  const { rows } = await pool.query(
    `SELECT id FROM solicitudes
     WHERE pasajero_id=$1 AND conductor_id=$2
       AND estado IN ('${ESTADOS.PENDIENTE}','${ESTADOS.ACEPTADA}')
       AND fecha_viaje = CURRENT_DATE`,
    [pasajeroId, conductorId],
  );
  return rows.length > 0;
}

async function insertSolicitud(pasajeroId, conductorId, iniciadoPor) {
  const { rows } = await pool.query(
    `INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje)
     VALUES ($1,$2,$3,CURRENT_DATE) RETURNING *`,
    [pasajeroId, conductorId, iniciadoPor],
  );
  return rows[0];
}

// ─── POST /api/solicitudes ────────────────────────────────────────────────────

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    if (role === ROLES.PASAJERO) {
      const { conductor_id } = req.body;
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });

      if (await solicitudExiste(userId, conductor_id)) {
        return res.status(409).json({ message: 'Ya tienes una solicitud para hoy con este conductor' });
      }

      const solicitud = await insertSolicitud(userId, conductor_id, userId);
      return res.status(201).json({ message: 'Solicitud enviada', solicitud });
    }

    if (role === ROLES.CONDUCTOR) {
      const { pasajero_id } = req.body;
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });

      if (await solicitudExiste(pasajero_id, userId)) {
        return res.status(409).json({ message: 'Ya enviaste una invitación a este pasajero hoy' });
      }

      const solicitud = await insertSolicitud(pasajero_id, userId, userId);
      return res.status(201).json({ message: 'Invitación enviada', solicitud });
    }

    res.status(400).json({ message: 'Rol no válido' });
  } catch (err) { next(err); }
});

// ─── GET /api/solicitudes/pendientes-count ────────────────────────────────────

router.get('/pendientes-count', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM solicitudes
       WHERE iniciado_por != $1
         AND (conductor_id=$1 OR pasajero_id=$1)
         AND estado='${ESTADOS.PENDIENTE}'`,
      [req.user.id],
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) { next(err); }
});

// ─── GET /api/solicitudes/mis-solicitudes ─────────────────────────────────────

router.get('/mis-solicitudes', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id, s.estado, s.created_at, s.iniciado_por,
        s.pasajero_id, s.conductor_id,
        p.name  AS pasajero_name,    p.city AS pasajero_city,
        p.university AS pasajero_university, p.phone AS pasajero_phone,
        c.name  AS conductor_name,   c.city AS conductor_city,
        c.car_model, c.vehicle_type, c.phone AS conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE s.pasajero_id=$1 OR s.conductor_id=$1
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) { next(err); }
});

// ─── PATCH /api/solicitudes/:id ───────────────────────────────────────────────

router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (![ESTADOS.ACEPTADA, ESTADOS.RECHAZADA].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
    }

    const { rows } = await pool.query('SELECT * FROM solicitudes WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const sol        = rows[0];
    const esReceptor = sol.iniciado_por != req.user.id
      && (sol.conductor_id == req.user.id || sol.pasajero_id == req.user.id);

    if (!esReceptor) return res.status(403).json({ message: 'No tienes permiso' });

    if (estado === ESTADOS.RECHAZADA) {
      await pool.query('DELETE FROM solicitudes WHERE id=$1', [req.params.id]);
      return res.json({ message: 'Solicitud rechazada' });
    }

    const { rows: updated } = await pool.query(
      'UPDATE solicitudes SET estado=$1 WHERE id=$2 RETURNING *',
      [estado, req.params.id],
    );
    res.json({ message: 'Solicitud aceptada', solicitud: updated[0] });
  } catch (err) { next(err); }
});

// ─── DELETE /api/solicitudes/:id ─────────────────────────────────────────────

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM solicitudes WHERE id=$1 AND iniciado_por=$2',
      [req.params.id, req.user.id],
    );
    if (!rows.length) return res.status(403).json({ message: 'No puedes cancelar esta solicitud' });

    await pool.query('DELETE FROM solicitudes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) { next(err); }
});

// ─── PATCH /api/solicitudes/:id/pickup ───────────────────────────────────────

router.patch('/:id/pickup', authMiddleware, async (req, res, next) => {
  try {
    const {
      pickup_lat, pickup_lon,
      pickup_direccion   = '',
      pickup_universidad = '',
      destino_lat        = null,
      destino_lon        = null,
    } = req.body;

    if (pickup_lat == null || pickup_lon == null) {
      return res.status(400).json({ message: 'pickup_lat y pickup_lon son requeridos' });
    }

    // Nombre legible del punto — delegado al servicio especializado
    const pickup_name = pickup_direccion
      || (await reverseGeocode(pickup_lat, pickup_lon));

    const { rows } = await pool.query(`
      UPDATE solicitudes
      SET pickup_lat=$1, pickup_lon=$2, pickup_name=$3,
          pickup_direccion=$4, pickup_universidad=$5,
          destino_lat=$6, destino_lon=$7
      WHERE id=$8 AND (pasajero_id=$9 OR conductor_id=$9)
      RETURNING id
    `, [
      pickup_lat, pickup_lon, pickup_name,
      pickup_direccion, pickup_universidad,
      destino_lat, destino_lon,
      req.params.id, req.user.id,
    ]);

    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada o sin permiso' });

    res.json({ message: 'Punto de recogida guardado', pickup_name });
  } catch (err) { next(err); }
});

export default router;