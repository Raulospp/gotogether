require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===============================
//  DB INIT
// ===============================
async function initDB() {
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

  console.log('✅ Base de datos lista');
}

// ===============================
//  HELPERS
// ===============================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

function buildUserPayload(row) {
  return {
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
  };
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${BASE_URL}/api/auth/verify?token=${token}`;
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Verifica tu cuenta en goTogether',
    html: `<h2>Hola ${name}</h2><p>Verifica tu cuenta:</p><a href="${verifyUrl}">Verificar</a>`,
  });
}

// ===============================
//  HEALTH
// ===============================
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ===============================
//  AUTH — REGISTRO PASAJERO
// ===============================
app.post('/auth/register/pasajero', async (req, res) => {
  try {
    const { name, email, password, city, university, phone, route } = req.body;
    if (!name || !email || !password || !city || !university)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });

    const exist = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exist.rows.length) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    await pool.query(
      `INSERT INTO users (name,email,password,role,city,university,phone,route,verify_token)
       VALUES ($1,$2,$3,'pasajero',$4,$5,$6,$7,$8)`,
      [name, email, hashed, city, university, phone ?? null, route ?? null, verifyToken]
    );

    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Registrado. Revisa tu correo para verificar tu cuenta.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  AUTH — REGISTRO CONDUCTOR
// ===============================
app.post('/auth/register/conductor', async (req, res) => {
  try {
    const { name, email, password, city, car_model, plate, vehicle_type, capacity, phone, route } = req.body;
    if (!name || !email || !password || !city || !car_model || !plate || !vehicle_type || !capacity)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });

    const exist = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exist.rows.length) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    await pool.query(
      `INSERT INTO users (name,email,password,role,city,car_model,plate,route,vehicle_type,capacity,phone,verify_token)
       VALUES ($1,$2,$3,'conductor',$4,$5,$6,$7,$8,$9,$10,$11)`,
      [name, email, hashed, city, car_model, plate, route ?? null, vehicle_type, capacity, phone ?? null, verifyToken]
    );

    await sendVerificationEmail(email, name, verifyToken);
    res.status(201).json({ message: 'Registrado. Revisa tu correo para verificar tu cuenta.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  AUTH — VERIFICAR EMAIL
// ===============================
app.get('/api/auth/verify', async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, JWT_SECRET);
    await pool.query('UPDATE users SET verified=true, verify_token=null WHERE email=$1', [decoded.email]);
    res.send('✅ Cuenta verificada. Ya puedes iniciar sesión.');
  } catch {
    res.status(400).send('Token inválido o expirado.');
  }
});

// ===============================
//  AUTH — LOGIN
// ===============================
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email y contraseña requeridos' });

    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows.length)
      return res.status(401).json({ message: 'Credenciales inválidas' });

    const userRow = result.rows[0];
    const match = await bcrypt.compare(password, userRow.password);
    if (!match)
      return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: userRow.id, role: userRow.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: buildUserPayload(userRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  USERS — CONDUCTORES
// ===============================
app.get('/api/users/conductores', authMiddleware, async (req, res) => {
  try {
    // Traer conductores con su horario, y calcular cupos disponibles
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone, u.route,
        h.schedule, h.routes, h.precio,
        -- Cupos ocupados hoy (solicitudes aceptadas)
        u.capacity - COALESCE((
          SELECT COUNT(*) FROM solicitudes s
          WHERE s.conductor_id = u.id
            AND s.estado = 'aceptada'
            AND s.fecha_viaje = CURRENT_DATE
        ), 0) AS cupos_disponibles,
        -- ¿El usuario actual ya solicitó a este conductor?
        EXISTS (
          SELECT 1 FROM solicitudes s
          WHERE s.conductor_id = u.id
            AND s.pasajero_id = $1
            AND s.estado IN ('pendiente','aceptada')
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

// ===============================
//  USERS — PASAJEROS
// ===============================
app.get('/api/users/pasajeros', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.university, u.phone, u.route,
        h.schedule, h.routes,
        -- ¿El conductor ya invitó a este pasajero?
        EXISTS (
          SELECT 1 FROM solicitudes s
          WHERE s.pasajero_id = u.id
            AND s.conductor_id = $1
            AND s.estado IN ('pendiente','aceptada')
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
//  SOLICITUDES — MIS SOLICITUDES
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

// ===============================
//  SOLICITUDES — PENDIENTES COUNT
// ===============================
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

// ===============================
//  SOLICITUDES — CREAR
// ===============================
app.post('/api/solicitudes', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const myRole = req.user.role;
    const { conductor_id, pasajero_id } = req.body;

    let finalConductorId, finalPasajeroId;

    if (myRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });
      finalPasajeroId = myId;
      finalConductorId = conductor_id;
    } else {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });
      finalConductorId = myId;
      finalPasajeroId = pasajero_id;
    }

    // Verificar que no exista ya una solicitud activa entre ellos
    const existe = await pool.query(`
      SELECT id FROM solicitudes
      WHERE pasajero_id = $1 AND conductor_id = $2
        AND estado IN ('pendiente','aceptada')
    `, [finalPasajeroId, finalConductorId]);

    if (existe.rows.length)
      return res.status(409).json({ message: 'Ya existe una solicitud activa entre estos usuarios' });

    // Verificar cupos si es pasajero solicitando
    if (myRole === 'pasajero') {
      const conductor = await pool.query('SELECT capacity FROM users WHERE id=$1', [finalConductorId]);
      const ocupados = await pool.query(`
        SELECT COUNT(*) FROM solicitudes
        WHERE conductor_id=$1 AND estado='aceptada' AND fecha_viaje=CURRENT_DATE
      `, [finalConductorId]);

      const cuposDisponibles = conductor.rows[0].capacity - parseInt(ocupados.rows[0].count);
      if (cuposDisponibles <= 0)
        return res.status(400).json({ message: 'El conductor no tiene cupos disponibles' });
    }

    const result = await pool.query(`
      INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje)
      VALUES ($1, $2, $3, CURRENT_DATE)
      RETURNING id
    `, [finalPasajeroId, finalConductorId, myId]);

    res.status(201).json({ message: 'Solicitud enviada', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  SOLICITUDES — RESPONDER (aceptar/rechazar)
// ===============================
app.patch('/api/solicitudes/:id', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['aceptada', 'rechazada'].includes(estado))
      return res.status(400).json({ message: 'Estado inválido' });

    // Solo puede responder quien recibió la solicitud (no quien la inició)
    const sol = await pool.query('SELECT * FROM solicitudes WHERE id=$1', [req.params.id]);
    if (!sol.rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const s = sol.rows[0];
    const myId = req.user.id;

    // Verificar que sea el destinatario (no el iniciador)
    const esDestinatario = s.iniciado_por !== myId &&
      (s.pasajero_id === myId || s.conductor_id === myId);

    if (!esDestinatario)
      return res.status(403).json({ message: 'No tienes permiso para responder esta solicitud' });

    await pool.query('UPDATE solicitudes SET estado=$1 WHERE id=$2', [estado, req.params.id]);
    res.json({ message: `Solicitud ${estado}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  SOLICITUDES — CANCELAR
// ===============================
app.delete('/api/solicitudes/:id', authMiddleware, async (req, res) => {
  try {
    const sol = await pool.query('SELECT * FROM solicitudes WHERE id=$1', [req.params.id]);
    if (!sol.rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const s = sol.rows[0];
    // Solo puede cancelar quien la inició
    if (s.iniciado_por !== req.user.id)
      return res.status(403).json({ message: 'Solo quien inició puede cancelar' });

    await pool.query('DELETE FROM solicitudes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  VIAJES — MIS VIAJES (solicitudes aceptadas de hoy)
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
        -- Horario y precio del conductor
        hc.schedule, hc.routes, hc.precio
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

// ===============================
//  VIAJES — LIMPIAR PASADOS
// ===============================
app.delete('/api/viajes/limpiar-pasados', authMiddleware, async (req, res) => {
  try {
    // Elimina solicitudes aceptadas de días anteriores donde el usuario participó
    await pool.query(`
      DELETE FROM solicitudes
      WHERE estado = 'aceptada'
        AND fecha_viaje < CURRENT_DATE
        AND (pasajero_id = $1 OR conductor_id = $1)
    `, [req.user.id]);

    res.json({ message: 'Viajes pasados limpiados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  HORARIOS — GUARDAR
// ===============================
app.post('/api/horarios', authMiddleware, async (req, res) => {
  try {
    const { schedule, routes, precio } = req.body;
    await pool.query(`
      INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET schedule=$2, routes=$3, precio=$4, updated_at=NOW()
    `, [req.user.id, schedule ?? {}, routes ?? {}, precio ?? {}]);

    res.json({ message: 'Horario guardado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  HORARIOS — OBTENER
// ===============================
app.get('/api/horarios', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT schedule, routes, precio FROM horarios WHERE user_id=$1',
      [req.user.id]
    );
    res.json(result.rows[0] || { schedule: {}, routes: {}, precio: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
//  ERROR GLOBAL
// ===============================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno' });
});

// ===============================
//  START
// ===============================
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en ${BASE_URL}:${PORT}`);
  });
});