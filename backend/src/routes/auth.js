import { Router }             from 'express';
import bcrypt                  from 'bcryptjs';
import jwt                     from 'jsonwebtoken';
import { pool }                from '../config/db.js';
import { authMiddleware }      from '../middlewares/auth.js';
import { sendVerificationEmail } from '../services/email.js';

const router     = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';

// ── Registro conductor ──────────────────────────────────────────────────────
router.post('/register/conductor', async (req, res, next) => {
  try {
    let { name, email, password, city, car_model, plate, route, vehicle_type, capacity, phone } = req.body;

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    vehicle_type = vehicle_type || 'carro';
    capacity     = capacity     || 4;
    route        = route        || '';
    phone        = phone        || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const hashed      = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, city, car_model, plate, route, vehicle_type, capacity, phone, verified, verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12)
       RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, verified`,
      [name, email, hashed, 'conductor', city, car_model, plate, route, vehicle_type, capacity, phone, verifyToken],
    );

    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Conductor registrado. Revisa tu correo', user: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Registro pasajero ───────────────────────────────────────────────────────
router.post('/register/pasajero', async (req, res, next) => {
  try {
    let { name, email, password, city, university, route, phone } = req.body;

    if (!name || !email || !password || !city || !university) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    route = route || '';
    phone = phone || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const hashed      = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, city, university, route, phone, verified, verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9)
       RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, verified`,
      [name, email, hashed, 'pasajero', city, university, route, phone, verifyToken],
    );

    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Pasajero registrado. Revisa tu correo', user: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Verificación de email ───────────────────────────────────────────────────
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token inválido');

    const decoded = jwt.verify(token, JWT_SECRET);
    const result  = await pool.query(
      'UPDATE users SET verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id',
      [decoded.email],
    );

    if (result.rows.length === 0) return res.status(404).send('Usuario no encontrado');

    res.send(`
      <html><body style="font-family:sans-serif;background:#070707;color:#ede9e6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h1 style="color:#a32020">✓ Cuenta verificada</h1>
          <p>Ya puedes iniciar sesión en <strong>goTogether</strong></p>
        </div>
      </body></html>
    `);
  } catch {
    res.status(400).send('Token inválido o expirado');
  }
});

// ── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        city:         user.city,
        university:   user.university,
        car_model:    user.car_model,
        plate:        user.plate,
        route:        user.route,
        vehicle_type: user.vehicle_type,
        capacity:     user.capacity,
        phone:        user.phone,
      },
    });
  } catch (err) { next(err); }
});

// ── Perfil propio ───────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, created_at FROM users WHERE id = $1',
      [req.user.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// ── Actualizar perfil ───────────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { name, city, phone, university, car_model, plate, password } = req.body;
    const fields = [];
    const values = [];
    let   idx    = 1;

    if (name)       { fields.push(`name = $${idx++}`);       values.push(name); }
    if (city)       { fields.push(`city = $${idx++}`);       values.push(city); }
    if (phone)      { fields.push(`phone = $${idx++}`);      values.push(phone); }
    if (university) { fields.push(`university = $${idx++}`); values.push(university); }
    if (car_model)  { fields.push(`car_model = $${idx++}`);  values.push(car_model); }
    if (plate)      { fields.push(`plate = $${idx++}`);      values.push(plate); }
    if (password) {
      fields.push(`password = $${idx++}`);
      values.push(await bcrypt.hash(password, 10));
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, city, university, car_model, plate, vehicle_type, capacity, phone`,
      values,
    );
    res.json({ message: 'Perfil actualizado', user: result.rows[0] });
  } catch (err) { next(err); }
});

export default router;