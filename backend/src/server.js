require('dotenv').config();
import connectDB from "../db/db.js"

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

connectDB()

async function initDB() {
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
      vehicle_type  VARCHAR(20),
      capacity      INTEGER,
      verified      BOOLEAN DEFAULT FALSE,
      verify_token  TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity INTEGER`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT`);
  console.log('Tabla users lista');
}

app.use(cors());
app.use(express.json());

app.get('/health', function(req, res) {
  res.json({ status: 'ok' });
});

function authMiddleware(req, res, next) {
  var header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token invalido o expirado' });
  }
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `http://localhost:3000/api/auth/verify?token=${token}`;
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

app.post('/api/auth/register/conductor', async function(req, res) {
  try {
    var { name, email, password, city, car_model, plate, route, vehicle_type, capacity } = req.body;
    vehicle_type = vehicle_type || 'carro';
    capacity = capacity || 4;
    route = route || '';

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    var existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    var hashed = await bcrypt.hash(password, 10);
    var verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    var result = await pool.query(
      'INSERT INTO users (name, email, password, role, city, car_model, plate, route, vehicle_type, capacity, verified, verify_token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, FALSE, $11) RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, verified',
      [name, email, hashed, 'conductor', city, car_model, plate, route, vehicle_type, capacity, verifyToken]
    );
    var user = result.rows[0];

    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({ message: 'Conductor registrado. Revisa tu correo para verificar tu cuenta.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/auth/register/pasajero', async function(req, res) {
  try {
    var { name, email, password, city, university, route } = req.body;
    route = route || '';

    if (!name || !email || !password || !city || !university) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    var existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    var hashed = await bcrypt.hash(password, 10);
    var verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    var result = await pool.query(
      'INSERT INTO users (name, email, password, role, city, university, route, verified, verify_token) VALUES ($1,$2,$3,$4,$5,$6,$7, FALSE, $8) RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, verified',
      [name, email, hashed, 'pasajero', city, university, route, verifyToken]
    );
    var user = result.rows[0];

    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({ message: 'Pasajero registrado. Revisa tu correo para verificar tu cuenta.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/auth/verify', async function(req, res) {
  try {
    var token = req.query.token;
    if (!token) return res.status(400).send('Token inválido');

    var decoded = jwt.verify(token, JWT_SECRET);
    var result = await pool.query('UPDATE users SET verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id', [decoded.email]);
    if (result.rows.length === 0) return res.status(404).send('Usuario no encontrado');

    res.send(`
      <html><body style="font-family:sans-serif;background:#070707;color:#ede9e6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h1 style="color:#a32020">✓ Cuenta verificada</h1>
          <p>Ya puedes iniciar sesión en <strong>goTogether</strong></p>
        </div>
      </body></html>
    `);
  } catch (err) {
    res.status(400).send('Token inválido o expirado');
  }
});

app.post('/api/auth/login', async function(req, res) {
  try {
    var { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    var result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    var user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    var match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    if (!user.verified) {
      return res.status(403).json({ message: 'Debes verificar tu correo antes de iniciar sesión' });
    }

    var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        city: user.city, university: user.university,
        car_model: user.car_model, plate: user.plate, route: user.route,
        vehicle_type: user.vehicle_type, capacity: user.capacity
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/auth/me', authMiddleware, async function(req, res) {
  try {
    var result = await pool.query(
      'SELECT id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

initDB()
  .then(function() {
    app.listen(PORT, '0.0.0.0', function() {
      console.log('Servidor corriendo en http://localhost:' + PORT);
    });
  })
  .catch(function(err) {
    console.error('Error conectando a la DB:', err.message);
    process.exit(1);
  });