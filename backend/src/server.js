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
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ===============================
//  MIDDLEWARES GLOBALES
// ===============================
app.use(cors({
  origin: '*',
}));

app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===============================
//  FUNCIONES AUXILIARES
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

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// 🔥 EMAIL CORREGIDO PARA RENDER
async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${BASE_URL}/api/auth/verify?token=${token}`;

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Verifica tu cuenta en goTogether',
    html: `
      <h2>Hola ${name}</h2>
      <p>Verifica tu cuenta:</p>
      <a href="${verifyUrl}">Verificar</a>
    `
  });
}

// ===============================
//  HEALTH
// ===============================
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===============================
//  AUTH
// ===============================
app.post('/api/auth/register/pasajero', async (req, res) => {
  try {
    const { name, email, password, city, university } = req.body;

    const exist = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exist.rows.length) return res.status(409).json({ message: 'Ya existe' });

    const hashed = await bcrypt.hash(password, 10);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    await pool.query(
      'INSERT INTO users (name,email,password,city,university,verify_token) VALUES ($1,$2,$3,$4,$5,$6)',
      [name, email, hashed, city, university, token]
    );

    await sendVerificationEmail(email, name, token);

    res.json({ message: 'Registrado, revisa tu correo' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, JWT_SECRET);

    await pool.query(
      'UPDATE users SET verified=true WHERE email=$1',
      [decoded.email]
    );

    res.send('Cuenta verificada');

  } catch {
    res.send('Token inválido');
  }
});

// ===============================
//  LOGIN
// ===============================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  if (!user.rows.length) return res.status(401).json({ message: 'Error' });

  const match = await bcrypt.compare(password, user.rows[0].password);
  if (!match) return res.status(401).json({ message: 'Error' });

  const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET);

  res.json({ token });
});

// ===============================
//  ERROR GLOBAL
// ===============================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno' });
});

// ===============================
//  START SERVER
// ===============================
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en ${BASE_URL}`);
  });
});