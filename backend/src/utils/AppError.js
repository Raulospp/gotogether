import { HTTP } from '../constants/index.js';

/**
 * Error operacional con código HTTP.
 * Lanzar AppError en services/repos → el error handler global lo formatea.
 */
export class AppError extends Error {
  constructor(message, status = HTTP.SERVER_ERROR, errorCode = null) {
    super(message);
    this.name      = 'AppError';
    this.status    = status;
    this.errorCode = errorCode;
    this.isOperational = true;
  }

  static badRequest(message, code)  { return new AppError(message, HTTP.BAD_REQUEST,  code); }
  static unauthorized(message, code){ return new AppError(message, HTTP.UNAUTHORIZED,  code); }
  static forbidden(message, code)   { return new AppError(message, HTTP.FORBIDDEN,     code); }
  static notFound(message, code)    { return new AppError(message, HTTP.NOT_FOUND,     code); }
  static conflict(message, code)    { return new AppError(message, HTTP.CONFLICT,      code); }
}
