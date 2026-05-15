import crypto from 'crypto';
import jwt    from 'jsonwebtoken';
import { pool }       from '../config/db.js';
import { JWT_SECRET } from '../config/jwt.js';
import { TOKEN }      from '../constants/index.js';

// ─── Access token (JWT, 15 min) ───────────────────────────────────────────────

export function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN.ACCESS_TTL },
  );
}

export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─── Refresh token (opaco, 30 días, persiste en DB) ──────────────────────────

export async function createRefreshToken(userId, device = null) {
  const token     = crypto.randomBytes(TOKEN.REFRESH_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN.REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, device, expires_at) VALUES ($1,$2,$3,$4)',
    [userId, token, device, expiresAt],
  );

  return token;
}

export async function rotateRefreshToken(oldTokenRow) {
  await pool.query('DELETE FROM refresh_tokens WHERE id=$1', [oldTokenRow.id]);
  return createRefreshToken(oldTokenRow.uid, oldTokenRow.device);
}

export async function findValidRefreshToken(token) {
  const { rows } = await pool.query(
    `SELECT rt.*, u.id AS uid, u.email, u.role
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [token],
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(token, userId) {
  await pool.query(
    'DELETE FROM refresh_tokens WHERE token=$1 AND user_id=$2',
    [token, userId],
  );
}

export async function revokeAllRefreshTokens(userId) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [userId]);
}
