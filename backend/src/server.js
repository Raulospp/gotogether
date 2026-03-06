require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      email       VARCHAR(150) UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        VARCHAR(20) DEFAULT 'pasajero',
      city        VARCHAR(100),
      university  VARCHAR(100),
      car_model   VARCHAR(100),
      plate       VARCHAR(20),
      route       VARCHAR(100),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
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

app.post('/api/auth/register/conductor', async function(req, res) {
  try {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var city = req.body.city;
    var car_model = req.body.car_model;
    var plate = req.body.plate;
    var route = req.body.route || '';

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    var existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    var hashed = await bcrypt.hash(password, 10);
    var result = await pool.query(
      'INSERT INTO users (name, email, password, role, city, car_model, plate, route) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, email, role, city, university, car_model, plate, route',
      [name, email, hashed, 'conductor', city, car_model, plate, route]
    );
    var user = result.rows[0];
    var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Conductor registrado', token: token, user: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/auth/register/pasajero', async function(req, res) {
  try {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var city = req.body.city;
    var university = req.body.university;
    var route = req.body.route || '';

    if (!name || !email || !password || !city || !university) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    var existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    var hashed = await bcrypt.hash(password, 10);
    var result = await pool.query(
      'INSERT INTO users (name, email, password, role, city, university, route) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, email, role, city, university, car_model, plate, route',
      [name, email, hashed, 'pasajero', city, university, route]
    );
    var user = result.rows[0];
    var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Pasajero registrado', token: token, user: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/auth/login', async function(req, res) {
  try {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contrasena requeridos' });
    }

    var result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    var user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    var match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login exitoso',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        university: user.university,
        car_model: user.car_model,
        plate: user.plate,
        route: user.route
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
      'SELECT id, name, email, role, city, university, car_model, plate, route, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
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