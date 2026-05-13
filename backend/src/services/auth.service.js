import bcrypt from 'bcryptjs';
import { UserRepository }       from '../repositories/user.repository.js';
import { AppError }             from '../utils/AppError.js';
import { userShape }            from '../utils/format.js';
import { LIMITS, DEFAULTS, MSG } from '../constants/index.js';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from './token.service.js';

export const AuthService = {

  registerConductor: async (body) => {
    const {
      name, email, password, city, car_model, plate,
      route        = '',
      phone        = '',
      vehicle_type = DEFAULTS.VEHICLE_TYPE,
      capacity     = DEFAULTS.CAPACITY,
    } = body;

    if (await UserRepository.emailExists(email))
      throw AppError.conflict(MSG.EMAIL_TAKEN, 'EMAIL_TAKEN');

    const hashedPassword = await bcrypt.hash(password, LIMITS.BCRYPT_ROUNDS);
    return UserRepository.createConductor({ name, email, hashedPassword, city, car_model, plate, route, vehicle_type, capacity, phone });
  },

  registerPasajero: async (body) => {
    const { name, email, password, city, university, route = '', phone = '' } = body;

    if (await UserRepository.emailExists(email))
      throw AppError.conflict(MSG.EMAIL_TAKEN, 'EMAIL_TAKEN');

    const hashedPassword = await bcrypt.hash(password, LIMITS.BCRYPT_ROUNDS);
    return UserRepository.createPasajero({ name, email, hashedPassword, city, university, route, phone });
  },

  login: async (email, password, device) => {
    const user = await UserRepository.findByEmail(email);

    // Mismo mensaje para user no encontrado y password incorrecto (evitar user enumeration)
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw AppError.unauthorized(MSG.INVALID_CREDS, 'INVALID_CREDENTIALS');

    const accessToken  = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id, device ?? null);

    return { accessToken, refreshToken, user: userShape(user) };
  },

  refreshTokens: async (refreshToken) => {
    const row = await findValidRefreshToken(refreshToken);
    if (!row) throw AppError.unauthorized('Refresh token inválido o expirado', 'INVALID_REFRESH_TOKEN');

    const newAccessToken  = signAccessToken({ id: row.uid, email: row.email, role: row.role });
    const newRefreshToken = await rotateRefreshToken(row);
    return { newAccessToken, newRefreshToken };
  },

  logout: async (refreshToken, userId) => {
    if (refreshToken) await revokeRefreshToken(refreshToken, userId);
  },

  logoutAll: async (userId) => {
    await revokeAllRefreshTokens(userId);
  },

  getProfile: async (userId) => {
    const user = await UserRepository.findById(userId);
    if (!user) throw AppError.notFound('Usuario no encontrado', 'USER_NOT_FOUND');
    return user;
  },

  updateProfile: async (userId, body) => {
    const allowedFields = ['name', 'city', 'phone', 'university', 'car_model', 'plate'];
    const fields = [], values = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) { fields.push(field); values.push(body[field]); }
    }

    if (body.password) {
      fields.push('password');
      values.push(await bcrypt.hash(body.password, LIMITS.BCRYPT_ROUNDS));
    }

    if (!fields.length) throw AppError.badRequest(MSG.NO_FIELDS, 'NO_FIELDS');

    return UserRepository.update(userId, fields, values);
  },
};
