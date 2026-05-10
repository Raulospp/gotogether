// backend/src/controllers/viajeController.js
const { pool } = require('../config'); // ✅ Corregido: usa la conexión desde config

exports.iniciarViaje = async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.id;
    const check = await pool.query(
      'SELECT id FROM solicitudes WHERE id = $1 AND conductor_id = $2 AND estado = $3',
      [solicitudId, userId, 'aceptada']
    );
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes iniciar este viaje' });
    await pool.query('UPDATE solicitudes SET estado = $1 WHERE id = $2', ['en_curso', solicitudId]);
    res.json({ message: 'Viaje iniciado' });
  } catch (err) { next(err); }
};

exports.finalizarViaje = async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.id;
    const check = await pool.query(
      'SELECT id FROM solicitudes WHERE id = $1 AND conductor_id = $2 AND estado = $3',
      [solicitudId, userId, 'en_curso']
    );
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes finalizar este viaje' });
    await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
    res.json({ message: 'Viaje finalizado' });
  } catch (err) { next(err); }
};

exports.getMisViajes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let result;

    if (userRole === 'conductor') {
      result = await pool.query(`
        SELECT s.id as solicitud_id, s.estado, s.fecha_viaje, s.created_at,
               p.id as pasajero_id, p.name as pasajero_name, p.city as pasajero_city,
               p.university as pasajero_university, p.phone as pasajero_phone,
               s.pickup_lat, s.pickup_lon, s.pickup_direccion,
               s.pickup_universidad, s.destino_lat, s.destino_lon,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes, '{}') as routes,
               COALESCE(h.precio, '{}') as precio
        FROM solicitudes s
        JOIN users p ON p.id = s.pasajero_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.conductor_id = $1::integer AND s.estado IN ('aceptada','en_curso') AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at DESC
      `, [userId]);
    } else {
      result = await pool.query(`
        SELECT s.id as solicitud_id, s.estado, s.fecha_viaje, s.created_at,
               c.id as conductor_id, c.name as conductor_name, c.city as conductor_city,
               c.car_model, c.plate, c.vehicle_type, c.phone as conductor_phone,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes, '{}') as routes,
               COALESCE(h.precio, '{}') as precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.pasajero_id = $1 AND s.estado IN ('pendiente','aceptada','en_curso') AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at DESC
      `, [userId]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getViajeById = async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;
    if (userRole === 'conductor') {
      result = await pool.query(`
        SELECT s.id as solicitud_id, s.estado, s.fecha_viaje, s.created_at,
               p.id as pasajero_id, p.name as pasajero_name, p.city as pasajero_city,
               p.university as pasajero_university, p.phone as pasajero_phone,
               s.pickup_lat, s.pickup_lon, s.pickup_direccion,
               s.pickup_universidad, s.destino_lat, s.destino_lon,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes, '{}') as routes,
               COALESCE(h.precio, '{}') as precio
        FROM solicitudes s
        JOIN users p ON p.id = s.pasajero_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.conductor_id = $1::integer
          AND s.estado IN ('aceptada','en_curso')
          AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at ASC
      `, [userId]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Viaje no encontrado' });
      const base = result.rows[0];
      return res.json({
        solicitud_id: base.solicitud_id,
        estado:       base.estado,
        fecha_viaje:  base.fecha_viaje,
        schedule:     base.schedule,
        routes:       base.routes,
        precio:       base.precio,
        pasajeros:    result.rows,
      });
    } else {
      result = await pool.query(`
        SELECT s.id as solicitud_id, s.estado, s.fecha_viaje, s.created_at,
               c.id as conductor_id, c.name as conductor_name, c.city as conductor_city,
               c.car_model, c.plate, c.vehicle_type, c.phone as conductor_phone,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes, '{}') as routes,
               COALESCE(h.precio, '{}') as precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.id = $1::integer AND s.pasajero_id = $2::integer
      `, [solicitudId, userId]);
    }
    if (result.rows.length === 0) return res.status(404).json({ message: 'Viaje no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateUbicacion = async (req, res, next) => {
  try {
    const { lat, lon, pickup_lat, pickup_lon, pickup_direccion, pickup_universidad, destino_lat, destino_lon } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;
    const pLat = pickup_lat ?? lat;
    const pLon = pickup_lon ?? lon;
    await pool.query(
      `UPDATE solicitudes
       SET pickup_lat = $1, pickup_lon = $2,
           pickup_direccion = COALESCE($3, pickup_direccion),
           pickup_universidad = COALESCE($4, pickup_universidad),
           destino_lat = COALESCE($5, destino_lat),
           destino_lon = COALESCE($6, destino_lon)
       WHERE id = $7::integer AND pasajero_id = $8::integer`,
      [pLat, pLon, pickup_direccion, pickup_universidad, destino_lat, destino_lon, solicitudId, userId]
    );
    res.json({ message: 'Ubicación actualizada' });
  } catch (err) { next(err); }
};

exports.limpiarViajesPasados = async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM solicitudes WHERE estado = 'aceptada' AND fecha_viaje < CURRENT_DATE RETURNING id"
    );
    res.json({ message: `${result.rowCount} viajes pasados eliminados` });
  } catch (err) { next(err); }
};  