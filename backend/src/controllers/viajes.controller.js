import { ViajeService } from '../services/viaje.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok }           from '../utils/response.js';

export const iniciarViaje = asyncHandler(async (req, res) => {
  await ViajeService.iniciar(req.params.id, req.user.id);
  ok(res, null, 'Viaje iniciado');
});

export const finalizarViaje = asyncHandler(async (req, res) => {
  await ViajeService.finalizar(req.params.id, req.user.id);
  ok(res, null, 'Viaje finalizado');
});

export const limpiarPasados = asyncHandler(async (req, res) => {
  const eliminados = await ViajeService.limpiarPasados();
  ok(res, { eliminados }, `${eliminados} viajes pasados eliminados`);
});

export const getMisViajes = asyncHandler(async (req, res) => {
  const viajes = await ViajeService.getMisViajes(req.user.id, req.user.role);
  ok(res, viajes, 'Viajes obtenidos');
});

export const getViajeById = asyncHandler(async (req, res) => {
  const viaje = await ViajeService.getById(req.params.id, req.user.id, req.user.role);
  ok(res, viaje, 'Viaje obtenido');
});

/** GET /api/viajes/ruta-consolidada — solo conductor */
export const getRutaConsolidada = asyncHandler(async (req, res) => {
  const resultado = await ViajeService.getRutaConsolidada(req.user.id);
  ok(res, resultado, 'Ruta consolidada obtenida');
});

/**
 * DELETE /api/viajes/:id/entregar — conductor marca pasajero como entregado.
 * Elimina al pasajero de la ruta activa del conductor.
 */
export const entregarPasajero = asyncHandler(async (req, res) => {
  const resultado = await ViajeService.entregarPasajero(req.params.id, req.user.id);
  ok(res, resultado, 'Pasajero entregado y eliminado de la ruta');
});
