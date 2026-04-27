require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');

// ===============================
//  CONFIGURACIÓN Y CONSTANTES
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!RESEND_API_KEY) console.warn('⚠️ RESEND_API_KEY no definida. No se enviarán correos.');
if (!DATABASE_URL) throw new Error('❌ DATABASE_URL es requerida en .env');

// ===============================
//  MIDDLEWARES GLOBALES
// ===============================
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===============================
//  CONEXIÓN A BASE DE DATOS
// ===============================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err);
  process.exit(-1);
});

// ===============================
//  FUNCIONES AUXILIARES
// ===============================
const buildUserPayload = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  city: row.city,
  university: row.university,
  car_model: row.car_model,
  plate: row.plate,
  route: row.route,
  vehicle_type: row.vehicle_type,
  capacity: row.capacity,
  phone: row.phone,
  verified: row.verified,
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido' });
  }
};

const sendVerificationEmail = async (email, name, token) => {
  if (!RESEND_API_KEY) return;
  const verifyUrl = `${BASE_URL}/api/auth/verify?token=${token}`;
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Verifica tu cuenta en goTogether',
    html: `
      <div style="font-family:sans-serif; max-width:480px; background:#070707; color:#ede9e6; padding:32px; border-radius:16px;">
        <h1 style="font-size:24px;">Hola, ${name} 👋</h1>
        <p>Gracias por registrarte en <strong style="color:#a32020">goTogether</strong>. Verifica tu cuenta:</p>
        <a href="${verifyUrl}" style="display:inline-block; background:#8B1A1A; color:#ede9e6; padding:12px 24px; border-radius:8px; text-decoration:none;">Verificar cuenta</a>
        <p style="font-size:12px; margin-top:24px;">Si no creaste esta cuenta, ignora este mensaje.</p>
      </div>
    `,
  });
};

// ===============================
//  INICIALIZACIÓN DE TABLAS
// ===============================
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(20) DEFAULT 'pasajero',
      city VARCHAR(100),
      university VARCHAR(100),
      car_model VARCHAR(100),
      plate VARCHAR(20),
      route VARCHAR(100),
      vehicle_type VARCHAR(20) DEFAULT 'carro',
      capacity INTEGER DEFAULT 4,
      phone VARCHAR(20),
      verified BOOLEAN DEFAULT FALSE,
      verify_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id SERIAL PRIMARY KEY,
      pasajero_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      conductor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por INTEGER REFERENCES users(id) ON DELETE CASCADE,
      estado VARCHAR(20) DEFAULT 'pendiente',
      fecha_viaje DATE DEFAULT CURRENT_DATE,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      schedule JSONB DEFAULT '{}',
      routes JSONB DEFAULT '{}',
      precio JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // Índices para mejorar rendimiento
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes(fecha_viaje);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_pareja ON solicitudes(pasajero_id, conductor_id);`);
  console.log('✅ Base de datos inicializada');
};

// ===============================
//  RUTAS DE SALUD
// ===============================
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ===============================
//  AUTH: REGISTRO
// ===============================
const createUser = async (req, res, role, requiredFields, extraData = {}) => {
  try {
    for (const field of requiredFields) {
      if (!req.body[field]) return res.status(400).json({ message: `Falta campo: ${field}` });
    }
    const { name, email, password, city, phone, route, ...rest } = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    const fields = ['name', 'email', 'password', 'role', 'city', 'phone', 'route', 'verify_token', ...Object.keys(extraData)];
    const values = [name, email, hashed, role, city, phone ?? null, route ?? null, verifyToken, ...Object.values(extraData)];

    await pool.query(
      `INSERT INTO users (${fields.join(',')}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(',')})`,
      values
    );
    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: `Registrado como ${role}. Revisa tu correo para verificar tu cuenta.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/auth/register/pasajero', (req, res) =>
  createUser(req, res, 'pasajero', ['name', 'email', 'password', 'city', 'university'], {
    university: req.body.university,
  })
);

app.post('/api/auth/register/conductor', (req, res) =>
  createUser(req, res, 'conductor', ['name', 'email', 'password', 'city', 'car_model', 'plate', 'vehicle_type', 'capacity'], {
    car_model: req.body.car_model,
    plate: req.body.plate,
    vehicle_type: req.body.vehicle_type,
    capacity: req.body.capacity,
  })
);

// ===============================
//  AUTH: VERIFICACIÓN Y LOGIN
// ===============================
app.get('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token no proporcionado');
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('UPDATE users SET verified = true, verify_token = null WHERE email = $1 RETURNING id', [decoded.email]);
    if (!result.rows.length) return res.status(404).send('Usuario no encontrado');
    res.send(`
      <html><body style="background:#070707;color:#ede9e6;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;">
        <div style="text-align:center;"><h1 style="color:#a32020">✓ Cuenta verificada</h1><p>Ya puedes iniciar sesión en <strong>goTogether</strong></p></div>
      </body></html>
    `);
  } catch (err) {
    res.status(400).send('Token inválido o expirado');
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ message: 'Credenciales inválidas' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: buildUserPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: buildUserPayload(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  USUARIOS: LISTADOS
// ===============================
app.get('/api/users/conductores', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone, u.route,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes, '{}') AS routes,
        COALESCE(h.precio, '{}') AS precio,
        u.capacity - COALESCE((
          SELECT COUNT(*) FROM solicitudes s
          WHERE s.conductor_id = u.id AND s.estado = 'aceptada' AND s.fecha_viaje = CURRENT_DATE
        ), 0) AS cupos_disponibles,
        EXISTS (
          SELECT 1 FROM solicitudes s
          WHERE s.conductor_id = u.id AND s.pasajero_id = $1 AND s.estado IN ('pendiente','aceptada')
        ) AS ya_solicitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = 'conductor' AND u.id != $1
      ORDER BY u.name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/pasajeros', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.university, u.phone, u.route,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes, '{}') AS routes,
        EXISTS (
          SELECT 1 FROM solicitudes s
          WHERE s.pasajero_id = u.id AND s.conductor_id = $1 AND s.estado IN ('pendiente','aceptada')
        ) AS ya_invitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = 'pasajero' AND u.id != $1
      ORDER BY u.name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  SOLICITUDES
// ===============================
app.get('/api/solicitudes/mis-solicitudes', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id, s.estado, s.created_at, s.iniciado_por,
        s.pasajero_id, s.conductor_id,
        p.name AS pasajero_name, p.city AS pasajero_city,
        p.university AS pasajero_university, p.phone AS pasajero_phone,
        c.name AS conductor_name, c.city AS conductor_city,
        c.car_model, c.plate, c.phone AS conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE (s.pasajero_id = $1 OR s.conductor_id = $1)
        AND s.estado != 'rechazada'
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/solicitudes/pendientes-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS count
      FROM solicitudes
      WHERE estado = 'pendiente'
        AND iniciado_por != $1
        AND (pasajero_id = $1 OR conductor_id = $1)
    `, [req.user.id]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solicitudes', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const myId = req.user.id;
    const myRole = req.user.role;
    const { conductor_id, pasajero_id } = req.body;

    let finalConductorId, finalPasajeroId;
    if (myRole === 'pasajero') {
      if (!conductor_id) throw new Error('conductor_id requerido');
      finalPasajeroId = myId;
      finalConductorId = conductor_id;
    } else {
      if (!pasajero_id) throw new Error('pasajero_id requerido');
      finalConductorId = myId;
      finalPasajeroId = pasajero_id;
    }

    // Verificar solicitud activa existente
    const existing = await client.query(`
      SELECT id FROM solicitudes
      WHERE pasajero_id = $1 AND conductor_id = $2
        AND estado IN ('pendiente', 'aceptada')
    `, [finalPasajeroId, finalConductorId]);
    if (existing.rows.length) throw new Error('Ya existe una solicitud activa entre estos usuarios');

    // Verificar cupos si es pasajero
    if (myRole === 'pasajero') {
      const conductor = await client.query('SELECT capacity FROM users WHERE id = $1', [finalConductorId]);
      const ocupados = await client.query(`
        SELECT COUNT(*) FROM solicitudes
        WHERE conductor_id = $1 AND estado = 'aceptada' AND fecha_viaje = CURRENT_DATE
      `, [finalConductorId]);
      const cuposDisponibles = conductor.rows[0].capacity - parseInt(ocupados.rows[0].count);
      if (cuposDisponibles <= 0) throw new Error('El conductor no tiene cupos disponibles');
    }

    const result = await client.query(`
      INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje)
      VALUES ($1, $2, $3, CURRENT_DATE)
      RETURNING id
    `, [finalPasajeroId, finalConductorId, myId]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Solicitud enviada', id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    const status = err.message.includes('requerido') ? 400 : (err.message.includes('cupos') ? 400 : 409);
    res.status(status).json({ message: err.message });
  } finally {
    client.release();
  }
});

app.patch('/api/solicitudes/:id', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    const solicitud = await pool.query('SELECT * FROM solicitudes WHERE id = $1', [req.params.id]);
    if (!solicitud.rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const s = solicitud.rows[0];
    const myId = req.user.id;
    if (s.iniciado_por === myId || !(s.pasajero_id === myId || s.conductor_id === myId)) {
      return res.status(403).json({ message: 'No tienes permiso para responder esta solicitud' });
    }

    await pool.query('UPDATE solicitudes SET estado = $1 WHERE id = $2', [estado, req.params.id]);
    res.json({ message: `Solicitud ${estado}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/solicitudes/:id', authMiddleware, async (req, res) => {
  try {
    const solicitud = await pool.query('SELECT * FROM solicitudes WHERE id = $1', [req.params.id]);
    if (!solicitud.rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (solicitud.rows[0].iniciado_por !== req.user.id) {
      return res.status(403).json({ message: 'Solo quien inició puede cancelar' });
    }
    await pool.query('DELETE FROM solicitudes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  VIAJES (HOY)
// ===============================
app.get('/api/viajes/mis-viajes', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id AS solicitud_id, s.estado, s.fecha_viaje,
        s.pasajero_id, s.conductor_id,
        p.name AS pasajero_name, p.city AS pasajero_city,
        p.university AS pasajero_university, p.phone AS pasajero_phone,
        c.name AS conductor_name, c.city AS conductor_city,
        c.car_model, c.plate, c.phone AS conductor_phone,
        COALESCE(hc.schedule, '{}') AS schedule,
        COALESCE(hc.routes, '{}') AS routes,
        COALESCE(hc.precio, '{}') AS precio
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      LEFT JOIN horarios hc ON hc.user_id = c.id
      WHERE s.estado = 'aceptada'
        AND s.fecha_viaje = CURRENT_DATE
        AND (s.pasajero_id = $1 OR s.conductor_id = $1)
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/viajes/limpiar-pasados', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM solicitudes
      WHERE estado = 'aceptada'
        AND fecha_viaje < CURRENT_DATE
        AND (pasajero_id = $1 OR conductor_id = $1)
      RETURNING id
    `, [req.user.id]);
    res.json({ message: `${result.rowCount} viajes pasados eliminados` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  HORARIOS
// ===============================
app.get('/api/horarios', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT schedule, routes, precio FROM horarios WHERE user_id = $1', [req.user.id]);
    res.json(result.rows[0] || { schedule: {}, routes: {}, precio: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/horarios', authMiddleware, async (req, res) => {
  try {
    const { schedule, routes, precio } = req.body;
    await pool.query(
      `INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET schedule = $2, routes = $3, precio = $4, updated_at = NOW()`,
      [req.user.id, schedule || {}, routes || {}, precio || {}]
    );
    res.json({ message: 'Horario guardado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  PERFIL (EDITAR)
// ===============================
app.patch('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'city', 'phone', 'university', 'car_model', 'plate', 'password'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        if (field === 'password') {
          const hashed = await bcrypt.hash(req.body.password, 10);
          updates.push(`password = $${idx++}`);
          values.push(hashed);
        } else {
          updates.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No hay campos para actualizar' });

    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json({ message: 'Perfil actualizado', user: buildUserPayload(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  MANEJO DE ERRORES GLOBAL
// ===============================
app.use((err, req, res, next) => {
  console.error('❌ Error no capturado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ===============================
//  INICIO DEL SERVIDOR
// ===============================
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en ${BASE_URL}:${PORT}`);
  });
}).catch(err => {
  console.error('❌ No se pudo inicializar la base de datos:', err.message);
  process.exit(1);
});