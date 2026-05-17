import { UserRepository } from '../repositories/user.repository.js';
import { asyncHandler }   from '../utils/async-handler.js';
import { ok }             from '../utils/response.js';
import { AppError }       from '../utils/AppError.js';
import { ROLES }          from '../constants/index.js';

/**
 * Pasajero → ve conductores.
 * Conductor → ve pasajeros.
 * Cualquier otro rol → 403.
 */
export const getUsuariosOpuestos = asyncHandler(async (req, res) => {
  const { id, role } = req.user;

  if (role === ROLES.PASAJERO) {
    const conductores = await UserRepository.findConductores(id);
    return ok(res, conductores, 'Conductores obtenidos');
  }

  if (role === ROLES.CONDUCTOR) {
    const pasajeros = await UserRepository.findPasajeros(id);
    return ok(res, pasajeros, 'Pasajeros obtenidos');
  }

  throw AppError.forbidden('Rol no autorizado para listar usuarios', 'FORBIDDEN_ROLE');
});

// Endpoints directos — se mantienen con guard de rol explícito
export const getConductores = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.PASAJERO)
    throw AppError.forbidden('Solo pasajeros pueden listar conductores', 'FORBIDDEN_ROLE');
  const conductores = await UserRepository.findConductores(req.user.id);
  ok(res, conductores, 'Conductores obtenidos');
});

export const getPasajeros = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.CONDUCTOR)
    throw AppError.forbidden('Solo conductores pueden listar pasajeros', 'FORBIDDEN_ROLE');
  const pasajeros = await UserRepository.findPasajeros(req.user.id);
  ok(res, pasajeros, 'Pasajeros obtenidos');
});
