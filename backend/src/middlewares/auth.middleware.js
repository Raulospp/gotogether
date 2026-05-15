import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { HTTP, MSG }  from '../constants/index.js';
import { fail }       from '../utils/response.js';

// ─── Autenticación JWT ────────────────────────────────────────────────────────

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return fail(res, HTTP.UNAUTHORIZED, MSG.MISSING_TOKEN, 'MISSING_TOKEN');
  }

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return fail(
      res,
      HTTP.UNAUTHORIZED,
      isExpired ? MSG.EXPIRED_TOKEN : MSG.INVALID_TOKEN,
      isExpired ? 'EXPIRED_TOKEN'  : 'INVALID_TOKEN',
    );
  }
}

// ─── Autorización por rol ─────────────────────────────────────────────────────

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return fail(res, HTTP.FORBIDDEN, MSG.FORBIDDEN, 'FORBIDDEN_ROLE');
    }
    next();
  };
}
