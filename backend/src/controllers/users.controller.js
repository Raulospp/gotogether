import { UserRepository } from '../repositories/user.repository.js';
import { asyncHandler }   from '../utils/async-handler.js';
import { ok }             from '../utils/response.js';

export const getConductores = asyncHandler(async (req, res) => {
  const conductores = await UserRepository.findConductores(req.user.id);
  ok(res, conductores, 'Conductores obtenidos');
});

export const getPasajeros = asyncHandler(async (req, res) => {
  const pasajeros = await UserRepository.findPasajeros(req.user.id);
  ok(res, pasajeros, 'Pasajeros obtenidos');
});
