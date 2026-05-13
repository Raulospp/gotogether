import { logger } from '../config/logger.js';
import { HTTP, MSG } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Error operacional conocido (AppError)
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Error operacional', { message: err.message, path: req.path, status: err.status });
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.errorCode && { error: err.errorCode }),
    });
  }

  // Error de validación de express-validator (pasado a next() manualmente)
  if (err.type === 'entity.parse.failed') {
    return res.status(HTTP.BAD_REQUEST).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la solicitud',
      error:   'INVALID_JSON',
    });
  }

  // Error inesperado — nunca exponer detalles internos
  logger.error('Error inesperado', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  return res.status(HTTP.SERVER_ERROR).json({
    success: false,
    message: MSG.SERVER_ERROR,
    error:   'INTERNAL_ERROR',
  });
}
