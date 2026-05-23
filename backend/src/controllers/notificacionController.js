const { pool } = require('../config');

/** GET /api/notificaciones
 *  Devuelve las notificaciones del usuario autenticado (máx. 50, más recientes primero).
 */
exports.getMisNotificaciones = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT id, tipo, titulo, mensaje, leida, solicitud_id, created_at
       FROM notificaciones
       WHERE usuario_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

/** GET /api/notificaciones/no-leidas-count
 *  Devuelve el conteo de notificaciones no leídas (para el badge).
 */
exports.getNoLeidasCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notificaciones
       WHERE usuario_id = $1 AND leida = FALSE`,
      [userId]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) { next(err); }
};

/** PATCH /api/notificaciones/:id/leer
 *  Marca una notificación como leída.
 */
exports.marcarLeida = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.query(
      `UPDATE notificaciones SET leida = TRUE
       WHERE id = $1 AND usuario_id = $2`,
      [id, userId]
    );
    res.json({ message: 'Notificación marcada como leída' });
  } catch (err) { next(err); }
};

/** PATCH /api/notificaciones/leer-todas
 *  Marca todas las notificaciones del usuario como leídas.
 */
exports.marcarTodasLeidas = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `UPDATE notificaciones SET leida = TRUE
       WHERE usuario_id = $1 AND leida = FALSE`,
      [userId]
    );
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) { next(err); }
};

/** DELETE /api/notificaciones/:id
 *  Elimina una notificación específica del usuario.
 */
exports.eliminarNotificacion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.query(
      `DELETE FROM notificaciones WHERE id = $1 AND usuario_id = $2`,
      [id, userId]
    );
    res.json({ message: 'Notificación eliminada' });
  } catch (err) { next(err); }
};

/** DELETE /api/notificaciones
 *  Elimina todas las notificaciones del usuario.
 */
exports.eliminarTodas = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `DELETE FROM notificaciones WHERE usuario_id = $1`,
      [userId]
    );
    res.json({ message: 'Historial de notificaciones borrado' });
  } catch (err) { next(err); }
};
