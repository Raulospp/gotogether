import { Router }               from 'express';
import bcrypt                    from 'bcryptjs';
import jwt                       from 'jsonwebtoken';
import crypto                    from 'crypto';
import { pool }                  from '../config/db.js';
import { authMiddleware }        from '../middlewares/auth.js';
import { sendVerificationEmail } from '../services/email.js';

const router = Router();

const JWT_SECRET         = process.env.JWT_SECRET || 'cambiame_en_produccion';
const ACCESS_TOKEN_TTL   = '15m';  // Access token: corto (15 min)
const REFRESH_TOKEN_DAYS = 30;     // Refresh token: largo (30 días)

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

async function makeRefreshToken(userId, device = null) {
  const token     = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, device, expires_at) VALUES ($1,$2,$3,$4)',
    [userId, token, device, expiresAt],
  );
  return token;
}

function userShape(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    city: u.city, university: u.university,
    car_model: u.car_model, plate: u.plate, route: u.route,
    vehicle_type: u.vehicle_type, capacity: u.capacity, phone: u.phone,
  };
}

// ── Registro conductor ────────────────────────────────────────────────────────
router.post('/register/conductor', async (req, res, next) => {
  try {
    let { name, email, password, city, car_model, plate, route, vehicle_type, capacity, phone } = req.body;
    if (!name || !email || !password || !city || !car_model || !plate)
      return res.status(400).json({ message: 'Todos los campos son requeridos' });

    vehicle_type = vehicle_type || 'carro';
    capacity     = capacity     || 4;
    route        = route        || '';
    phone        = phone        || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed      = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    const result      = await pool.query(
      `INSERT INTO users (name,email,password,role,city,car_model,plate,route,vehicle_type,capacity,phone,verified,verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12)
       RETURNING id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone,verified`,
      [name, email, hashed, 'conductor', city, car_model, plate, route, vehicle_type, capacity, phone, verifyToken],
    );
    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Conductor registrado. Revisa tu correo', user: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Registro pasajero ─────────────────────────────────────────────────────────
router.post('/register/pasajero', async (req, res, next) => {
  try {
    let { name, email, password, city, university, route, phone } = req.body;
    if (!name || !email || !password || !city || !university)
      return res.status(400).json({ message: 'Todos los campos son requeridos' });

    route = route || '';
    phone = phone || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed      = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    const result      = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,route,phone,verified,verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9)
       RETURNING id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone,verified`,
      [name, email, hashed, 'pasajero', city, university, route, phone, verifyToken],
    );
    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Pasajero registrado. Revisa tu correo', user: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Verificación de email ─────────────────────────────────────────────────────
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token inválido');
    const decoded = jwt.verify(token, JWT_SECRET);
    const result  = await pool.query(
      'UPDATE users SET verified=TRUE, verify_token=NULL WHERE email=$1 RETURNING id',
      [decoded.email],
    );
    if (result.rows.length === 0) return res.status(404).send('Usuario no encontrado');
    res.send(`<html><body style="font-family:sans-serif;background:#070707;color:#ede9e6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;"><h1 style="color:#a32020">✓ Cuenta verificada</h1><p>Ya puedes iniciar sesión en <strong>goTogether</strong></p></div>
    </body></html>`);
  } catch { res.status(400).send('Token inválido o expirado'); }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, device } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const accessToken  = makeAccessToken(user);
    const refreshToken = await makeRefreshToken(user.id, device ?? null);

    res.json({
      message:       'Login exitoso',
      access_token:  accessToken,
      refresh_token: refreshToken,
      expires_in:    ACCESS_TOKEN_TTL,
      user:          userShape(user),
    });
  } catch (err) { next(err); }
});

// ── Renovar access token ──────────────────────────────────────────────────────
// POST /api/auth/refresh  |  Body: { refresh_token }
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ message: 'refresh_token requerido' });

    const result = await pool.query(
      `SELECT rt.*, u.id as uid, u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token=$1 AND rt.expires_at > NOW()`,
      [refresh_token],
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Refresh token inválido o expirado. Inicia sesión de nuevo.' });

    const row = result.rows[0];

    // Rotación: eliminar token usado → emitir par nuevo (previene reutilización)
    await pool.query('DELETE FROM refresh_tokens WHERE id=$1', [row.id]);
    const newAccessToken  = makeAccessToken({ id: row.uid, email: row.email, role: row.role });
    const newRefreshToken = await makeRefreshToken(row.uid, row.device);

    res.json({
      access_token:  newAccessToken,
      refresh_token: newRefreshToken,
      expires_in:    ACCESS_TOKEN_TTL,
    });
  } catch (err) { next(err); }
});

// ── Logout (este dispositivo) ─────────────────────────────────────────────────
// DELETE /api/auth/logout  |  Body: { refresh_token }
router.delete('/logout', authMiddleware, async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token=$1 AND user_id=$2',
        [refresh_token, req.user.id],
      );
    }
    res.json({ message: 'Sesión cerrada' });
  } catch (err) { next(err); }
});

// ── Logout de todos los dispositivos ─────────────────────────────────────────
// DELETE /api/auth/logout-all
router.delete('/logout-all', authMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Todas las sesiones cerradas' });
  } catch (err) { next(err); }
});

// ── Perfil propio ─────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone,created_at FROM users WHERE id=$1',
      [req.user.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Actualizar perfil ─────────────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { name, city, phone, university, car_model, plate, password } = req.body;
    const fields = [], values = [];
    let idx = 1;

    if (name)       { fields.push(`name=$${idx++}`);       values.push(name); }
    if (city)       { fields.push(`city=$${idx++}`);       values.push(city); }
    if (phone)      { fields.push(`phone=$${idx++}`);      values.push(phone); }
    if (university) { fields.push(`university=$${idx++}`); values.push(university); }
    if (car_model)  { fields.push(`car_model=$${idx++}`);  values.push(car_model); }
    if (plate)      { fields.push(`plate=$${idx++}`);      values.push(plate); }
    if (password)   { fields.push(`password=$${idx++}`);   values.push(await bcrypt.hash(password, 10)); }

    if (fields.length === 0) return res.status(400).json({ message: 'No hay campos para actualizar' });

    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx}
       RETURNING id,name,email,role,city,university,car_model,plate,vehicle_type,capacity,phone`,
      values,
    );
    res.json({ message: 'Perfil actualizado', user: result.rows[0] });
  } catch (err) { next(err); }
});

export default router;