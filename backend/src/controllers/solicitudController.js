const pool = require('../../db/db');

exports.crearSolicitud = async (req, res, next) => {
  try {
    const { conductor_id, pasajero_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });
      const existe = await pool.query(
        `SELECT id FROM solicitudes
         WHERE pasajero_id = $1 AND conductor_id = $2
         AND estado IN ('pendiente','aceptada') AND fecha_viaje = CURRENT_DATE`,
        [userId, conductor_id]
      );
      if (existe.rows.length > 0) return res.status(409).json({ message: 'Ya tienes una solicitud para hoy con este conductor' });
      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *',
        [userId, conductor_id, userId]
      );
      return res.status(201).json({ message: 'Solicitud enviada', solicitud: result.rows[0] });
    }

    if (userRole === 'conductor') {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });
      const existe = await pool.query(
        `SELECT id FROM solicitudes
         WHERE pasajero_id = $1 AND conductor_id = $2
         AND estado IN ('pendiente','aceptada') AND fecha_viaje = CURRENT_DATE`,
        [pasajero_id, userId]
      );
      if (existe.rows.length > 0) return res.status(409).json({ message: 'Ya enviaste una invitación a este pasajero hoy' });
      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *',
        [pasajero_id, userId, userId]
      );
      return res.status(201).json({ message: 'Invitación enviada', solicitud: result.rows[0] });
    }

    res.status(400).json({ message: 'Rol no válido' });
  } catch (err) { next(err); }
};

exports.getPendientesCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM solicitudes WHERE iniciado_por != $1 AND (conductor_id = $1 OR pasajero_id = $1) AND estado = $2',
      [userId, 'pendiente']
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getMisSolicitudes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT s.id, s.estado, s.created_at, s.iniciado_por,
             s.pasajero_id, s.conductor_id,
             s.pickup_lat, s.pickup_lon, s.pickup_direccion,
             s.pickup_universidad, s.destino_lat, s.destino_lon,
             p.name as pasajero_name, p.city as pasajero_city,
             p.university as pasajero_university, p.phone as pasajero_phone,
             c.name as conductor_name, c.city as conductor_city,
             c.car_model, c.vehicle_type, c.phone as conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE s.pasajero_id = $1 OR s.conductor_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.updatePickup = async (req, res, next) => {
  try {
    const { pickup_lat, pickup_lon, pickup_direccion, pickup_universidad, destino_lat, destino_lon } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;
    await pool.query(
      `UPDATE solicitudes
       SET pickup_lat = $1, pickup_lon = $2,
           pickup_direccion = COALESCE($3, pickup_direccion),
           pickup_universidad = COALESCE($4, pickup_universidad),
           destino_lat = COALESCE($5, destino_lat),
           destino_lon = COALESCE($6, destino_lon)
       WHERE id = $7::integer AND pasajero_id = $8::integer`,
      [pickup_lat, pickup_lon, pickup_direccion, pickup_universidad, destino_lat, destino_lon, solicitudId, userId]
    );
    res.json({ message: 'Ubicación actualizada' });
  } catch (err) { next(err); }
};

exports.responderSolicitud = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
    }
    const solicitud = await pool.query('SELECT * FROM solicitudes WHERE id = $1', [solicitudId]);
    if (solicitud.rows.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
    const sol = solicitud.rows[0];
    const esReceptor = (sol.iniciado_por != userId) && (sol.conductor_id == userId || sol.pasajero_id == userId);
    if (!esReceptor) return res.status(403).json({ message: 'No tienes permiso' });
    if (estado === 'rechazada') {
      await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
      return res.json({ message: 'Solicitud rechazada y eliminada' });
    }
    const result = await pool.query('UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *', [estado, solicitudId]);
    res.json({ message: 'Solicitud aceptada', solicitud: result.rows[0] });
  } catch (err) { next(err); }
};

exports.cancelarSolicitud = async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.id;
    const check = await pool.query('SELECT id FROM solicitudes WHERE id = $1 AND iniciado_por = $2', [solicitudId, userId]);
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes cancelar esta solicitud' });
    await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) { next(err); }
};