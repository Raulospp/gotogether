const { pool } = require('../config');

/**
 * Tipos de notificación manejados por el sistema:
 *  - solicitud_recibida   : alguien te envió una solicitud/invitación
 *  - solicitud_aceptada   : tu solicitud fue aceptada
 *  - solicitud_rechazada  : tu solicitud fue rechazada
 *  - solicitud_cancelada  : el otro canceló la solicitud
 *  - viaje_iniciado       : el conductor inició el viaje
 *  - viaje_finalizado     : el viaje terminó
 *  - nueva_resena         : recibiste una reseña
 */

/**
 * Crea una notificación para un usuario.
 * @param {object} params
 * @param {number}  params.usuarioId      - destinatario
 * @param {string}  params.tipo           - tipo de notificación
 * @param {string}  params.titulo         - título corto
 * @param {string}  params.mensaje        - cuerpo del mensaje
 * @param {number}  [params.solicitudId]  - referencia opcional
 */
async function crearNotificacion({ usuarioId, tipo, titulo, mensaje, solicitudId = null }) {
  await pool.query(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, solicitud_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, tipo, titulo, mensaje, solicitudId]
  );
}

/**
 * Notifica al receptor de una nueva solicitud/invitación.
 * @param {object} solicitud  - fila de la tabla solicitudes
 * @param {string} nombreEmisor
 */
async function notificarSolicitudRecibida(solicitud, nombreEmisor) {
  const esConductorElQueInicia = solicitud.iniciado_por === solicitud.conductor_id;
  const receptorId = esConductorElQueInicia ? solicitud.pasajero_id : solicitud.conductor_id;

  const titulo  = esConductorElQueInicia
    ? '🚗 Nueva invitación de conductor'
    : '🙋 Nueva solicitud de pasajero';
  const mensaje = esConductorElQueInicia
    ? `${nombreEmisor} te invitó a su viaje de hoy.`
    : `${nombreEmisor} quiere unirse a tu viaje de hoy.`;

  await crearNotificacion({
    usuarioId:   receptorId,
    tipo:        'solicitud_recibida',
    titulo,
    mensaje,
    solicitudId: solicitud.id,
  });
}

/**
 * Notifica al emisor original cuando responden su solicitud.
 */
async function notificarRespuestaSolicitud(solicitud, estado, nombreReceptor) {
  const aceptada = estado === 'aceptada';
  await crearNotificacion({
    usuarioId:   solicitud.iniciado_por,
    tipo:        aceptada ? 'solicitud_aceptada' : 'solicitud_rechazada',
    titulo:      aceptada ? '✅ Solicitud aceptada' : '❌ Solicitud rechazada',
    mensaje:     aceptada
                   ? `${nombreReceptor} aceptó tu solicitud. ¡Listo para el viaje!`
                   : `${nombreReceptor} rechazó tu solicitud.`,
    solicitudId: solicitud.id,
  });
}

/**
 * Notifica a todos los involucrados cuando se cancela una solicitud.
 */
async function notificarCancelacion(solicitud, nombreEmisor) {
  // Notificar al otro participante (no al que canceló)
  const receptorId = solicitud.iniciado_por === solicitud.pasajero_id
    ? solicitud.conductor_id
    : solicitud.pasajero_id;

  await crearNotificacion({
    usuarioId:   receptorId,
    tipo:        'solicitud_cancelada',
    titulo:      '🚫 Solicitud cancelada',
    mensaje:     `${nombreEmisor} canceló la solicitud de viaje.`,
    solicitudId: solicitud.id,
  });
}

/**
 * Notifica a todos los pasajeros que el conductor inició el viaje.
 */
async function notificarViajeIniciado(conductorId, nombreConductor, solicitudIds) {
  const ids = Array.isArray(solicitudIds) ? solicitudIds : [solicitudIds];

  for (const solId of ids) {
    const { rows } = await pool.query(
      'SELECT pasajero_id FROM solicitudes WHERE id = $1',
      [solId]
    );
    if (rows.length > 0) {
      await crearNotificacion({
        usuarioId:   rows[0].pasajero_id,
        tipo:        'viaje_iniciado',
        titulo:      '🚙 ¡El viaje comenzó!',
        mensaje:     `${nombreConductor} ha iniciado el viaje. ¡Prepárate!`,
        solicitudId: solId,
      });
    }
  }
}

/**
 * Notifica a todos los pasajeros que el viaje finalizó.
 */
async function notificarViajeFinalizado(nombreConductor, solicitudIds) {
  const ids = Array.isArray(solicitudIds) ? solicitudIds : [solicitudIds];

  for (const solId of ids) {
    const { rows } = await pool.query(
      'SELECT pasajero_id FROM solicitudes WHERE id = $1',
      [solId]
    );
    if (rows.length > 0) {
      await crearNotificacion({
        usuarioId:   rows[0].pasajero_id,
        tipo:        'viaje_finalizado',
        titulo:      '🏁 Viaje finalizado',
        mensaje:     `Tu viaje con ${nombreConductor} ha terminado. ¡Recuerda calificar!`,
        solicitudId: solId,
      });
    }
  }
}

/**
 * Notifica al receptor de una nueva reseña.
 */
async function notificarNuevaResena(receptorId, nombreAutor) {
  await crearNotificacion({
    usuarioId: receptorId,
    tipo:      'nueva_resena',
    titulo:    '⭐ Nueva reseña recibida',
    mensaje:   `${nombreAutor} te dejó una reseña.`,
  });
}

module.exports = {
  crearNotificacion,
  notificarSolicitudRecibida,
  notificarRespuestaSolicitud,
  notificarCancelacion,
  notificarViajeIniciado,
  notificarViajeFinalizado,
  notificarNuevaResena,
};
