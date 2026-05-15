import { logger } from './logger.js';

if (!process.env.JWT_SECRET) {
  logger.warn('JWT_SECRET no está definido en .env — la aplicación no es segura en producción');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
