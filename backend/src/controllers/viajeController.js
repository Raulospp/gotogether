const { pool } = require('../config');

exports.iniciarViaje = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const solicitudId = req.params.id;
    if (solicitudId && solicitudId !== 'undefined') {
      const result = await pool.query(
        `UPDATE solicitudes SET estado = 'en_curso'
         WHERE id = $1::integer AND conductor_id = $2::integer AND estado = 'aceptada'
         RETURNING id`,
        [solicitudId, userId]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
      return res.json({ message: 'Viaje iniciado' });
    }
    const result = await pool.query(
      `UPDATE solicitudes SET estado = 'en_curso'
       WHERE conductor_id = $1::integer AND estado = 'aceptada' RETURNING id`,
      [userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'No hay solicitudes aceptadas' });
    res.json({ message: 'Viaje iniciado', actualizadas: result.rowCount });
  } catch (err) { next(err); }
};

exports.finalizarViaje = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const solicitudId = req.params.id;
    if (solicitudId && solicitudId !== 'undefined') {
      const result = await pool.query(
        `UPDATE solicitudes SET estado = 'finalizada'
         WHERE id = $1::integer AND conductor_id = $2::integer AND estado IN ('en_curso','aceptada')
         RETURNING id`,
        [solicitudId, userId]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
      return res.json({ message: 'Viaje finalizado' });
    }
    const result = await pool.query(
      `UPDATE solicitudes SET estado = 'finalizada'
       WHERE conductor_id = $1::integer AND estado IN ('en_curso','aceptada') RETURNING id`,
      [userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'No hay viajes para finalizar' });
    res.json({ message: 'Viaje finalizado', actualizadas: result.rowCount });
  } catch (err) { next(err); }
};

exports.calificarViaje = async (req, res, next) => {
  try {
    const { calificacion, comentario, conductor_id } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;
    if (!calificacion || calificacion < 1 || calificacion > 5)
      return res.status(400).json({ message: 'Calificacion debe ser entre 1 y 5' });
    const check = await pool.query(
      `SELECT id, conductor_id FROM solicitudes
       WHERE id = $1::integer AND pasajero_id = $2::integer AND estado = 'finalizada'`,
      [solicitudId, userId]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ message: 'Solo puedes calificar viajes finalizados' });
    const ya = await pool.query('SELECT calificacion FROM solicitudes WHERE id=$1', [solicitudId]);
    if (ya.rows[0]?.calificacion) return res.status(409).json({ message: 'Ya calificaste este viaje' });
    await pool.query(
      `UPDATE solicitudes SET calificacion = $1, comentario_calificacion = $2 WHERE id = $3`,
      [calificacion, comentario || null, solicitudId]
    );
    const cId = conductor_id || check.rows[0].conductor_id;
    try {
      await pool.query(
        `INSERT INTO resenas (autor_id, receptor_id, solicitud_id, calificacion, comentario)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, cId, solicitudId, calificacion, comentario || null]
      );
    } catch(e) {}
    res.json({ message: 'Calificacion enviada' });
  } catch (err) { next(err); }
};

// Helper para construir objeto agrupado del conductor
async function getViajesConductor(conductorId) {
  const result = await pool.query(`
    SELECT DISTINCT ON (p.id)
           s.id as solicitud_id, s.estado, s.fecha_viaje,
           p.id as pasajero_id, p.name as pasajero_name,
           p.city as pasajero_city, p.university as pasajero_university,
           p.phone as pasajero_phone,
           s.pickup_lat, s.pickup_lon, s.pickup_direccion,
           s.pickup_universidad, s.destino_lat, s.destino_lon,
           COALESCE(h.schedule, '{}') as schedule,
           COALESCE(h.routes,   '{}') as routes,
           COALESCE(h.precio,   '{}') as precio
    FROM solicitudes s
    JOIN users p ON p.id = s.pasajero_id
    LEFT JOIN horarios h ON h.user_id = s.conductor_id
    WHERE s.conductor_id = $1::integer
      AND s.estado IN ('aceptada','en_curso')
    ORDER BY p.id, s.created_at DESC
  `, [conductorId]);
  if (result.rows.length === 0) return null;
  const base = result.rows[0];
  return {
    solicitud_id: base.solicitud_id,
    estado:       base.estado,
    fecha_viaje:  base.fecha_viaje,
    schedule:     base.schedule,
    routes:       base.routes,
    precio:       base.precio,
    pasajeros:    result.rows.map(r => ({
      solicitud_id:        r.solicitud_id,
      pasajero_id:         r.pasajero_id,
      pasajero_name:       r.pasajero_name,
      pasajero_city:       r.pasajero_city,
      pasajero_university: r.pasajero_university,
      pasajero_phone:      r.pasajero_phone,
      pickup_lat:          r.pickup_lat,
      pickup_lon:          r.pickup_lon,
      pickup_direccion:    r.pickup_direccion,
      pickup_universidad:  r.pickup_universidad,
      destino_lat:         r.destino_lat,
      destino_lon:         r.destino_lon,
      estado:              r.estado,
    })),
  };
}

exports.getMisViajes = async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'conductor') {
      const viaje = await getViajesConductor(userId);
      return res.json(viaje ? [viaje] : []);
    } else {
      const result = await pool.query(`
        SELECT s.id as solicitud_id, s.estado, s.fecha_viaje,
               s.pickup_lat, s.pickup_lon, s.pickup_direccion,
               s.pickup_universidad, s.destino_lat, s.destino_lon,
               s.calificacion, s.comentario_calificacion, s.precio_viaje,
               c.id as conductor_id, c.name as conductor_name,
               c.city as conductor_city, c.car_model, c.plate,
               c.vehicle_type, c.phone as conductor_phone,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes,   '{}') as routes,
               COALESCE(h.precio,   '{}') as precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.pasajero_id = $1::integer
          AND s.estado IN ('pendiente','aceptada','en_curso','finalizada')
          AND s.fecha_viaje >= CURRENT_DATE - INTERVAL '1 day'
        ORDER BY s.created_at DESC
      `, [userId]);
      res.json(result.rows);
    }
  } catch (err) { next(err); }
};

exports.getViajeById = async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId      = req.user.id;
    const userRole    = req.user.role;

    if (userRole === 'conductor') {
      const viaje = await getViajesConductor(userId);
      if (!viaje) return res.status(404).json({ message: 'Viaje no encontrado' });
      return res.json(viaje);
    } else {
      let result = await pool.query(`
        SELECT s.id as solicitud_id, s.estado, s.fecha_viaje,
               s.pickup_lat, s.pickup_lon, s.pickup_direccion,
               s.pickup_universidad, s.destino_lat, s.destino_lon,
               s.calificacion, s.comentario_calificacion, s.precio_viaje,
               c.id as conductor_id, c.name as conductor_name,
               c.city as conductor_city, c.car_model, c.plate,
               c.vehicle_type, c.phone as conductor_phone,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes,   '{}') as routes,
               COALESCE(h.precio,   '{}') as precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.id = $1::integer AND s.pasajero_id = $2::integer
      `, [solicitudId, userId]);

      if (result.rows.length === 0) {
        result = await pool.query(`
          SELECT s.id as solicitud_id, s.estado, s.fecha_viaje,
                 s.pickup_lat, s.pickup_lon, s.pickup_direccion,
                 s.pickup_universidad, s.destino_lat, s.destino_lon,
                 s.calificacion, s.comentario_calificacion, s.precio_viaje,
                 c.id as conductor_id, c.name as conductor_name,
                 c.city as conductor_city, c.car_model, c.plate,
                 c.vehicle_type, c.phone as conductor_phone,
                 COALESCE(h.schedule, '{}') as schedule,
                 COALESCE(h.routes,   '{}') as routes,
                 COALESCE(h.precio,   '{}') as precio
          FROM solicitudes s
          JOIN users c ON c.id = s.conductor_id
          LEFT JOIN horarios h ON h.user_id = s.conductor_id
          WHERE s.pasajero_id = $1::integer
            AND s.estado IN ('aceptada','en_curso','finalizada')
            AND s.fecha_viaje >= CURRENT_DATE - INTERVAL '1 day'
          ORDER BY s.created_at DESC
          LIMIT 1
        `, [userId]);
      }

      if (result.rows.length === 0) return res.status(404).json({ message: 'Viaje no encontrado' });
      res.json(result.rows[0]);
    }
  } catch (err) { next(err); }
};

exports.updateUbicacion = async (req, res, next) => {
  try {
    const { lat, lon, pickup_lat, pickup_lon, pickup_direccion, pickup_universidad, destino_lat, destino_lon } = req.body;
    const solicitudId = req.params.id;
    const userId      = req.user.id;
    const pLat = pickup_lat ?? lat;
    const pLon = pickup_lon ?? lon;
    await pool.query(
      `UPDATE solicitudes
       SET pickup_lat = $1, pickup_lon = $2,
           pickup_direccion   = COALESCE($3, pickup_direccion),
           pickup_universidad = COALESCE($4, pickup_universidad),
           destino_lat        = COALESCE($5, destino_lat),
           destino_lon        = COALESCE($6, destino_lon)
       WHERE id = $7::integer AND pasajero_id = $8::integer`,
      [pLat, pLon, pickup_direccion, pickup_universidad, destino_lat, destino_lon, solicitudId, userId]
    );
    res.json({ message: 'Ubicacion actualizada' });
  } catch (err) { next(err); }
};

exports.limpiarViajesPasados = async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM solicitudes WHERE estado = 'pendiente' AND fecha_viaje < CURRENT_DATE RETURNING id`
    );
    res.json({ message: result.rowCount + ' viajes pasados eliminados' });
  } catch (err) { next(err); }
};

exports.getPickupsConductor = async (req, res, next) => {
  try {
    const conductorId = req.params.conductorId;
    const result = await pool.query(`
      SELECT s.id as solicitud_id,
             p.name as pasajero_name,
             s.pickup_lat, s.pickup_lon, s.pickup_direccion,
             s.pickup_universidad, s.destino_lat, s.destino_lon
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      WHERE s.conductor_id = $1::integer
        AND s.estado IN ('aceptada','en_curso')
        AND s.fecha_viaje >= CURRENT_DATE - INTERVAL '1 day'
        AND s.pickup_lat IS NOT NULL
      ORDER BY s.created_at ASC
    `, [conductorId]);
    res.json(result.rows);
  } catch (err) { next(err); }
};