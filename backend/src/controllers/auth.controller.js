import { AuthService }    from '../services/auth.service.js';
import { asyncHandler }   from '../utils/async-handler.js';
import { ok, created, fail } from '../utils/response.js';
import { HTTP }           from '../constants/index.js';

export const registerConductor = asyncHandler(async (req, res) => {
  const user = await AuthService.registerConductor(req.body);
  created(res, { user }, 'Conductor registrado exitosamente');
});

export const registerPasajero = asyncHandler(async (req, res) => {
  const user = await AuthService.registerPasajero(req.body);
  created(res, { user }, 'Pasajero registrado exitosamente');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, device } = req.body;
  const { accessToken, refreshToken, user } = await AuthService.login(email, password, device);

  ok(res, {
    // alias legacy para compatibilidad con el frontend existente
    token:         accessToken,
    access_token:  accessToken,
    refresh_token: refreshToken,
    user,
  }, 'Login exitoso');
});

export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return fail(res, HTTP.BAD_REQUEST, 'refresh_token requerido', 'MISSING_FIELD');

  const { newAccessToken, newRefreshToken } = await AuthService.refreshTokens(refresh_token);
  ok(res, { access_token: newAccessToken, refresh_token: newRefreshToken }, 'Token renovado');
});

export const logout = asyncHandler(async (req, res) => {
  await AuthService.logout(req.body.refresh_token, req.user.id);
  ok(res, null, 'Sesión cerrada');
});

export const logoutAll = asyncHandler(async (req, res) => {
  await AuthService.logoutAll(req.user.id);
  ok(res, null, 'Todas las sesiones cerradas');
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await AuthService.getProfile(req.user.id);
  ok(res, { user }, 'Perfil obtenido');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await AuthService.updateProfile(req.user.id, req.body);
  ok(res, { user }, 'Perfil actualizado');
});
