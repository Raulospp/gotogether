import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { SolicitudService }    from '../services/solicitud.service.js';
import { asyncHandler }        from '../utils/async-handler.js';
import { ok, created }         from '../utils/response.js';
import { LIMITS }              from '../constants/index.js';

export const crearSolicitud = asyncHandler(async (req, res) => {
  const solicitud = await SolicitudService.crear(req.user.id, req.user.role, req.body);
  const message   = req.user.role === 'pasajero' ? 'Solicitud enviada' : 'Invitación enviada';
  created(res, { solicitud }, message);
});

export const getPendientesCount = asyncHandler(async (req, res) => {
  const count = await SolicitudRepository.countPendientesPara(req.user.id);
  ok(res, { count }, 'Conteo obtenido');
});

export const getMisSolicitudes = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page  ?? 1,  10);
  const limit = parseInt(req.query.limit ?? LIMITS.PAGE_SIZE, 10);
  const solicitudes = await SolicitudRepository.findByUsuario(req.user.id, { page, limit });
  ok(res, { solicitudes, page, limit }, 'Solicitudes obtenidas');
});

export const responderSolicitud = asyncHandler(async (req, res) => {
  const solicitud = await SolicitudService.responder(req.params.id, req.user.id, req.body.estado);
  const message   = solicitud ? 'Solicitud aceptada' : 'Solicitud rechazada';
  ok(res, solicitud ? { solicitud } : null, message);
});

export const cancelarSolicitud = asyncHandler(async (req, res) => {
  await SolicitudService.cancelar(req.params.id, req.user.id);
  ok(res, null, 'Solicitud cancelada');
});

export const guardarPickup = asyncHandler(async (req, res) => {
  const pickup_name = await SolicitudService.guardarPickup(req.params.id, req.user.id, req.body);
  ok(res, { pickup_name }, 'Punto de recogida guardado');
});
