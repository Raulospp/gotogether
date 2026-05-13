import { HorarioRepository } from '../repositories/horario.repository.js';
import { asyncHandler }       from '../utils/async-handler.js';
import { ok }                 from '../utils/response.js';

export const upsertHorario = asyncHandler(async (req, res) => {
  const { schedule = {}, routes = {}, precio = {} } = req.body;
  await HorarioRepository.upsertFull(req.user.id, schedule, routes, precio);
  ok(res, null, 'Horario guardado');
});

export const getMiHorario = asyncHandler(async (req, res) => {
  const horario = await HorarioRepository.findByUserId(req.user.id);
  ok(res, horario ?? { schedule: {}, routes: {}, precio: {} }, 'Horario obtenido');
});
