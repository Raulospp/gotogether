const pool = require('../../db/db');

exports.getConductores = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.city, u.car_model, u.plate, u.vehicle_type, u.capacity, u.phone,
             COALESCE(h.schedule, '{}') as schedule,
             COALESCE(h.routes, '{}') as routes,
             COALESCE(h.precio, '{}') as precio,
             u.capacity - COALESCE(
               (SELECT COUNT(*) FROM solicitudes s
                WHERE s.conductor_id = u.id AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE), 0
             ) as cupos_disponibles,
             EXISTS(
               SELECT 1 FROM solicitudes s
               WHERE s.conductor_id = u.id AND s.pasajero_id = $2
               AND s.estado IN ('pendiente','aceptada') AND s.fecha_viaje = CURRENT_DATE
             ) as ya_solicitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['conductor', req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getPasajeros = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.city, u.university, u.phone,
             COALESCE(h.schedule, '{}') as schedule,
             EXISTS(
               SELECT 1 FROM solicitudes s
               WHERE s.pasajero_id = u.id AND s.conductor_id = $2
               AND s.estado IN ('pendiente','aceptada') AND s.fecha_viaje = CURRENT_DATE
             ) as ya_invitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['pasajero', req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};