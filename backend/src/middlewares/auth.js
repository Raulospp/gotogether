import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET no está definido en .env — usando valor inseguro');
}

const SECRET = JWT_SECRET || 'cambiame_en_produccion';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token inválido';
    return res.status(401).json({ message });
  }
}