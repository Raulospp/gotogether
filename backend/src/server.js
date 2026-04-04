require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');

// ===============================
//  CONFIGURACIÓN
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const resend = new Resend(process.env.RESEND_API_KEY);

// Pool de conexiones optimizado
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ===============================
//  MIDDLEWARES GLOBALES
// ===============================
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Logging simple de peticiones (útil para debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===============================
//  FUNCIONES AUXILIARES
// ===============================
async function initDB() {
  // Usuarios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(150) UNIQUE NOT NULL,
      password      TEXT NOT NULL,
      role          VARCHAR(20) DEFAULT 'pasajero',
      city          VARCHAR(100),
      university    VARCHAR(100),
      car_model     VARCHAR(100),
      plate         VARCHAR(20),
      route         VARCHAR(100),
      vehicle_type  VARCHAR(20) DEFAULT 'carro',
      capacity      INTEGER DEFAULT 4,
      phone         VARCHAR(20),
      verified      BOOLEAN DEFAULT FALSE,
      verify_token  TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Agregar columnas faltantes (si no existen)
  const columns = ['vehicle_type', 'capacity', 'verified', 'verify_token', 'phone'];
  for (const col of columns) {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${col === 'capacity' ? 'INTEGER' : (col === 'verified' ? 'BOOLEAN DEFAULT FALSE' : 'TEXT')}`).catch(() => {});
  }

  // Solicitudes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id            SERIAL PRIMARY KEY,
      pasajero_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      conductor_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      estado        VARCHAR(20) DEFAULT 'pendiente',
      fecha_viaje   DATE DEFAULT CURRENT_DATE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS iniciado_por INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_viaje DATE DEFAULT CURRENT_DATE`);

  // Horarios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id        SERIAL PRIMARY KEY,
      user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      schedule  JSONB DEFAULT '{}',
      routes    JSONB DEFAULT '{}',
      precio    JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE horarios ADD COLUMN IF NOT EXISTS precio JSONB DEFAULT '{}'`);

  // Índices para mejorar rendimiento
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_pasajero ON solicitudes(pasajero_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_conductor ON solicitudes(conductor_id);`);

  console.log('✅ Base de datos lista');
}

// Middleware de autenticación JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// Envío de correo de verificación
async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `http://localhost:${PORT}/api/auth/verify?token=${token}`;
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Verifica tu cuenta en goTogether',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #070707; color: #ede9e6; padding: 32px; border-radius: 16px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Hola, ${name} 👋</h1>
        <p style="color: rgba(237,233,230,0.6); margin-bottom: 24px;">Gracias por registrarte en <strong style="color:#a32020">goTogether</strong>. Solo un paso más:</p>
        <a href="${verifyUrl}" style="display:inline-block; background:#8B1A1A; color:#ede9e6; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Verificar mi cuenta
        </a>
        <p style="color: rgba(237,233,230,0.35); font-size: 12px; margin-top: 24px;">Si no creaste esta cuenta, ignora este mensaje.</p>
      </div>
    `
  });
}

// ===============================
//  MANEJADOR DE ERRORES CENTRALIZADO
// ===============================
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
}
app.use(errorHandler); // Se coloca al final, después de las rutas

// ===============================
//  RUTAS DE SALUD
// ===============================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===============================
//  AUTH
// ===============================
app.post('/api/auth/register/conductor', async (req, res, next) => {
  try {
    let { name, email, password, city, car_model, plate, route, vehicle_type, capacity, phone } = req.body;
    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    vehicle_type = vehicle_type || 'carro';
    capacity = capacity || 4;
    route = route || '';
    phone = phone || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, city, car_model, plate, route, vehicle_type, capacity, phone, verified, verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12)
       RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, verified`,
      [name, email, hashed, 'conductor', city, car_model, plate, route, vehicle_type, capacity, phone, verifyToken]
    );
    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Conductor registrado. Revisa tu correo', user: result.rows[0] });
  } catch (err) { next(err); }
});

app.post('/api/auth/register/pasajero', async (req, res, next) => {
  try {
    let { name, email, password, city, university, route, phone } = req.body;
    if (!name || !email || !password || !city || !university) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    route = route || '';
    phone = phone || '';

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, city, university, route, phone, verified, verify_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9)
       RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, verified`,
      [name, email, hashed, 'pasajero', city, university, route, phone, verifyToken]
    );
    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Pasajero registrado. Revisa tu correo', user: result.rows[0] });
  } catch (err) { next(err); }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).send('Token inválido');
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('UPDATE users SET verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id', [decoded.email]);
    if (result.rows.length === 0) return res.status(404).send('Usuario no encontrado');
    res.send(`
      <html><body style="font-family:sans-serif;background:#070707;color:#ede9e6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;"><h1 style="color:#a32020">✓ Cuenta verificada</h1><p>Ya puedes iniciar sesión en <strong>goTogether</strong></p></div>
      </body></html>
    `);
  } catch (err) {
    res.status(400).send('Token inválido o expirado');
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });
    // Verificación desactivada temporalmente
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        city: user.city, university: user.university,
        car_model: user.car_model, plate: user.plate, route: user.route,
        vehicle_type: user.vehicle_type, capacity: user.capacity, phone: user.phone
      }
    });
  } catch (err) { next(err); }
});

app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// ===============================
//  USUARIOS (FEED)
// ===============================
app.get('/api/users/conductores', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.city, u.car_model, u.plate, u.vehicle_type, u.capacity, u.phone,
             COALESCE(h.schedule, '{}') as schedule,
             COALESCE(h.routes, '{}') as routes,
             COALESCE(h.precio, '{}') as precio,
             u.capacity - COALESCE(
               (SELECT COUNT(*) FROM solicitudes s
                WHERE s.conductor_id = u.id AND s.estado = 'aceptada'), 0
             ) as cupos_disponibles,
             EXISTS(
               SELECT 1 FROM solicitudes s
               WHERE s.conductor_id = u.id AND s.pasajero_id = $2 AND s.estado IN ('pendiente','aceptada')
             ) as ya_solicitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['conductor', req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.get('/api/users/pasajeros', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.city, u.university, u.phone,
             COALESCE(h.schedule, '{}') as schedule,
             EXISTS(
               SELECT 1 FROM solicitudes s
               WHERE s.pasajero_id = u.id AND s.conductor_id = $2 AND s.estado IN ('pendiente','aceptada')
             ) as ya_invitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['pasajero', req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ===============================
//  SOLICITUDES
// ===============================
app.post('/api/solicitudes', authMiddleware, async (req, res, next) => {
  try {
    const { conductor_id, pasajero_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });
      const existe = await pool.query(
        'SELECT id FROM solicitudes WHERE pasajero_id = $1 AND conductor_id = $2 AND estado = $3',
        [userId, conductor_id, 'pendiente']
      );
      if (existe.rows.length > 0) return res.status(409).json({ message: 'Ya tienes una solicitud pendiente con este conductor' });
      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por) VALUES ($1, $2, $3) RETURNING *',
        [userId, conductor_id, userId]
      );
      return res.status(201).json({ message: 'Solicitud enviada', solicitud: result.rows[0] });
    }

    if (userRole === 'conductor') {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });
      const existe = await pool.query(
        'SELECT id FROM solicitudes WHERE pasajero_id = $1 AND conductor_id = $2 AND estado = $3',
        [pasajero_id, userId, 'pendiente']
      );
      if (existe.rows.length > 0) return res.status(409).json({ message: 'Ya enviaste una invitación a este pasajero' });
      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por) VALUES ($1, $2, $3) RETURNING *',
        [pasajero_id, userId, userId]
      );
      return res.status(201).json({ message: 'Invitación enviada', solicitud: result.rows[0] });
    }

    res.status(400).json({ message: 'Rol no válido' });
  } catch (err) { next(err); }
});

app.get('/api/solicitudes/mis-solicitudes', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT s.id, s.estado, s.created_at, s.iniciado_por,
             s.pasajero_id, s.conductor_id,
             p.name as pasajero_name, p.city as pasajero_city,
             p.university as pasajero_university, p.phone as pasajero_phone,
             c.name as conductor_name, c.city as conductor_city,
             c.car_model, c.vehicle_type, c.phone as conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE s.pasajero_id = $1 OR s.conductor_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.patch('/api/solicitudes/:id', authMiddleware, async (req, res, next) => {
  try {
    const { estado } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
    }
    const solicitud = await pool.query('SELECT * FROM solicitudes WHERE id = $1', [solicitudId]);
    if (solicitud.rows.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
    const sol = solicitud.rows[0];
    const esReceptor = (sol.iniciado_por != userId) && (sol.conductor_id == userId || sol.pasajero_id == userId);
    if (!esReceptor) return res.status(403).json({ message: 'No tienes permiso' });
    if (estado === 'rechazada') {
      await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
      return res.json({ message: 'Solicitud rechazada y eliminada' });
    }
    const result = await pool.query('UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *', [estado, solicitudId]);
    res.json({ message: 'Solicitud aceptada', solicitud: result.rows[0] });
  } catch (err) { next(err); }
});

app.delete('/api/solicitudes/:id', authMiddleware, async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.id;
    const check = await pool.query('SELECT id FROM solicitudes WHERE id = $1 AND iniciado_por = $2', [solicitudId, userId]);
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes cancelar esta solicitud' });
    await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) { next(err); }
});

app.get('/api/solicitudes/pendientes-count', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM solicitudes WHERE iniciado_por != $1 AND (conductor_id = $1 OR pasajero_id = $1) AND estado = $2',
      [userId, 'pendiente']
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { next(err); }
});

// ===============================
//  PERFIL (EDITAR)
// ===============================
app.patch('/api/auth/profile', authMiddleware, async (req, res, next) => {
  try {
    const { name, city, phone, university, car_model, plate, password } = req.body;
    const userId = req.user.id;
    const fields = [];
    const values = [];
    let idx = 1;
    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (city) { fields.push(`city = $${idx++}`); values.push(city); }
    if (phone) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (university) { fields.push(`university = $${idx++}`); values.push(university); }
    if (car_model) { fields.push(`car_model = $${idx++}`); values.push(car_model); }
    if (plate) { fields.push(`plate = $${idx++}`); values.push(plate); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`);
      values.push(hashed);
    }
    if (fields.length === 0) return res.status(400).json({ message: 'No hay campos para actualizar' });
    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, city, university, car_model, plate, vehicle_type, capacity, phone`,
      values
    );
    res.json({ message: 'Perfil actualizado', user: result.rows[0] });
  } catch (err) { next(err); }
});

// ===============================
//  MIS VIAJES
// ===============================
app.get('/api/viajes/mis-viajes', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let result;
    if (userRole === 'conductor') {
      result = await pool.query(`
        SELECT s.id as solicitud_id, s.created_at,
               p.id as pasajero_id, p.name as pasajero_name, p.city as pasajero_city,
               p.university as pasajero_university, p.phone as pasajero_phone,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes, '{}') as routes,
               COALESCE(h.precio, '{}') as precio
        FROM solicitudes s
        JOIN users p ON p.id = s.pasajero_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.conductor_id = $1 AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at DESC
      `, [userId]);
    } else {
      result = await pool.query(`
        SELECT s.id as solicitud_id, s.fecha_viaje, s.created_at,
               c.id as conductor_id, c.name as conductor_name, c.city as conductor_city,
               c.car_model, c.plate, c.vehicle_type, c.phone as conductor_phone,
               COALESCE(h.schedule, '{}') as schedule,
               COALESCE(h.routes, '{}') as routes,
               COALESCE(h.precio, '{}') as precio
        FROM solicitudes s
        JOIN users c ON c.id = s.conductor_id
        LEFT JOIN horarios h ON h.user_id = s.conductor_id
        WHERE s.pasajero_id = $1 AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE
        ORDER BY s.created_at DESC
      `, [userId]);
    }
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.delete('/api/viajes/limpiar-pasados', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM solicitudes WHERE estado = 'aceptada' AND fecha_viaje < CURRENT_DATE RETURNING id");
    res.json({ message: `${result.rowCount} viajes pasados eliminados` });
  } catch (err) { next(err); }
});

// ===============================
//  HORARIOS
// ===============================
app.post('/api/horarios', authMiddleware, async (req, res, next) => {
  try {
    const { schedule, routes, precio } = req.body;
    const userId = req.user.id;
    await pool.query(`
      INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET schedule = $2, routes = $3, precio = $4, updated_at = NOW()
    `, [userId, JSON.stringify(schedule || {}), JSON.stringify(routes || {}), JSON.stringify(precio || {})]);
    res.json({ message: 'Horario guardado' });
  } catch (err) { next(err); }
});

app.get('/api/horarios/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT schedule, routes, precio FROM horarios WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.json({ schedule: {}, routes: {}, precio: {} });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ===============================
//  INICIO DEL SERVIDOR
// ===============================
initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error conectando a la base de datos:', err.message);
    process.exit(1);
  });