import { HTTP } from '../constants/index.js';

/**
 * Respuesta de éxito estandarizada.
 * { success: true, message, data }
 */
export function ok(res, data = null, message = 'OK', status = HTTP.OK) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res, data, message) {
  return ok(res, data, message, HTTP.CREATED);
}

/**
 * Respuesta de error estandarizada.
 * { success: false, message, error }
 */
export function fail(res, status, message, errorCode = null) {
  const body = { success: false, message };
  if (errorCode) body.error = errorCode;
  return res.status(status).json(body);
}

export const respond = { ok, created, fail };
