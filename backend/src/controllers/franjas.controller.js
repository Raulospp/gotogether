import { FranjaService } from '../services/franja.service.js';
import { asyncHandler }  from '../utils/async-handler.js';
import { ok, created }   from '../utils/response.js';
import { AppError }      from '../utils/AppError.js';
import { ROLES }         from '../constants/index.js';

// ── Solo conductores ──────────────────────────────────────────────────────────

export const listarFranjas = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden gestionar franjas', 'FORBIDDEN_ROLE');
  const franjas = await FranjaService.listar(req.user.id);
  ok(res, { franjas }, 'Franjas obtenidas');
});

export const crearFranja = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden crear franjas', 'FORBIDDEN_ROLE');
  const franja = await FranjaService.crear(req.user.id, req.body);
  created(res, { franja }, 'Franja horaria creada');
});

export const actualizarFranja = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden editar franjas', 'FORBIDDEN_ROLE');
  const franja = await FranjaService.actualizar(req.params.id, req.user.id, req.body);
  ok(res, { franja }, 'Franja actualizada');
});

export const eliminarFranja = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden eliminar franjas', 'FORBIDDEN_ROLE');
  await FranjaService.eliminar(req.params.id, req.user.id);
  ok(res, null, 'Franja eliminada');
});

// ── Solo pasajeros — sugerencia de conductores ───────────────────────────────

export const sugerirConductores = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.PASAJERO)
    throw AppError.forbidden('Solo pasajeros pueden buscar conductores', 'FORBIDDEN_ROLE');

  const { destino, radius } = req.query;
  if (!destino)
    throw AppError.badRequest('El parámetro destino es requerido', 'MISSING_PARAM');

  const radiusKm   = parseFloat(radius) || undefined;
  const conductores = await FranjaService.sugerirConductores(destino, radiusKm);

  ok(res, {
    query:  destino,
    total:  conductores.length,
    conductores,
  }, 'Conductores sugeridos');
});
