import { Router }        from 'express';
import bcrypt             from 'bcryptjs';
import { pool }           from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { userShape }      from '../utils/format.js';
import { LIMITS, DEFAULTS } from '../constants/index.js';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from '../services/token.service.js';

const router = Router();

// ── Registro conductor ────────────────────────────────────────────────────────

router.post('/register/conductor', async (req, res, next) => {
  try {
    let { name, email, password, city, car_model, plate, route, vehicle_type, capacity, phone } = req.body;
    if (!name || !email || !password || !city || !car_model || !plate)
      return res.status(400).json({ message: 'Todos los campos son requeridos' });

    vehicle_type = vehicle_type || DEFAULTS.VEHICLE_TYPE;
    capacity     = capacity     || DEFAULTS.CAPACITY;
    route        = route        || '';
    phone        = phone        || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed = await bcrypt.hash(password, LIMITS.BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,password,role,city,car_model,plate,route,vehicle_type,capacity,phone,verified)
       VALUES ($1,$2,$3,'conductor',$4,$5,$6,$7,$8,$9,$10,TRUE)
       RETURNING id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone`,
      [name, email, hashed, city, car_model, plate, route, vehicle_type, capacity, phone],
    );
    res.status(201).json({ message: 'Conductor registrado exitosamente', user: rows[0] });
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

    const hashed = await bcrypt.hash(password, LIMITS.BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,route,phone,verified)
       VALUES ($1,$2,$3,'pasajero',$4,$5,$6,$7,TRUE)
       RETURNING id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone`,
      [name, email, hashed, city, university, route, phone],
    );
    res.status(201).json({ message: 'Pasajero registrado exitosamente', user: rows[0] });
  } catch (err) { next(err); }
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, device } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const accessToken  = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id, device ?? null);

    res.json({
      message:       'Login exitoso',
      token:         accessToken,  // alias legacy para compatibilidad con el frontend
      access_token:  accessToken,
      refresh_token: refreshToken,
      user:          userShape(user),
    });
  } catch (err) { next(err); }
});

// ── Renovar access token ──────────────────────────────────────────────────────

router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ message: 'refresh_token requerido' });

    const row = await findValidRefreshToken(refresh_token);
    if (!row) return res.status(401).json({ message: 'Refresh token inválido o expirado. Inicia sesión de nuevo.' });

    const newAccessToken  = signAccessToken({ id: row.uid, email: row.email, role: row.role });
    const newRefreshToken = await rotateRefreshToken(row);

    res.json({ access_token: newAccessToken, refresh_token: newRefreshToken });
  } catch (err) { next(err); }
});

// ── Logout (este dispositivo) ─────────────────────────────────────────────────

router.delete('/logout', authMiddleware, async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) await revokeRefreshToken(refresh_token, req.user.id);
    res.json({ message: 'Sesión cerrada' });
  } catch (err) { next(err); }
});

// ── Logout de todos los dispositivos ─────────────────────────────────────────

router.delete('/logout-all', authMiddleware, async (req, res, next) => {
  try {
    await revokeAllRefreshTokens(req.user.id);
    res.json({ message: 'Todas las sesiones cerradas' });
  } catch (err) { next(err); }
});

// ── Perfil propio ─────────────────────────────────────────────────────────────

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,email,role,city,university,car_model,plate,route,vehicle_type,capacity,phone,created_at FROM users WHERE id=$1',
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: rows[0] });
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
    if (password)   { fields.push(`password=$${idx++}`);   values.push(await bcrypt.hash(password, LIMITS.BCRYPT_ROUNDS)); }

    if (!fields.length) return res.status(400).json({ message: 'No hay campos para actualizar' });

    values.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx}
       RETURNING id,name,email,role,city,university,car_model,plate,vehicle_type,capacity,phone`,
      values,
    );
    res.json({ message: 'Perfil actualizado', user: rows[0] });
  } catch (err) { next(err); }
});

export default router;
