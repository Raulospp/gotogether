require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config');        // ← ahora contiene { pool, PORT, ... }
const errorHandler = require('./middleware/errorHandler');

// Rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const solicitudRoutes = require('./routes/solicitudes');
const viajeRoutes = require('./routes/viajes');
const horarioRoutes = require('./routes/horarios');
const geocodeRoutes = require('./routes/geocode');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/viajes', viajeRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/geocode', geocodeRoutes);

// Manejador de errores (siempre al final)
app.use(errorHandler);

// ========================
// FUNCIÓN INITDB COMPLETA
// ========================
async function initDB() {
  const client = await config.pool.connect();
  client.release();

  // Tabla users
  await config.pool.query(`
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
  await config.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'carro'`);
  await config.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 4`);
  await config.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
  await config.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT`);
  await config.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);

  // Tabla solicitudes
  await config.pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id SERIAL PRIMARY KEY,
      pasajero_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      conductor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por INTEGER REFERENCES users(id) ON DELETE CASCADE,
      estado VARCHAR(20) DEFAULT 'pendiente',
      fecha_viaje DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      pickup_lat DOUBLE PRECISION,
      pickup_lon DOUBLE PRECISION,
      pickup_direccion TEXT,
      pickup_universidad TEXT,
      destino_lat DOUBLE PRECISION,
      destino_lon DOUBLE PRECISION
    );
  `);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS iniciado_por INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_viaje DATE DEFAULT CURRENT_DATE`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS pickup_lon DOUBLE PRECISION`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS pickup_direccion TEXT`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS pickup_universidad TEXT`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS destino_lat DOUBLE PRECISION`);
  await config.pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS destino_lon DOUBLE PRECISION`);

  // Tabla horarios
  await config.pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      schedule JSONB DEFAULT '{}',
      routes JSONB DEFAULT '{}',
      precio JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await config.pool.query(`ALTER TABLE horarios ADD COLUMN IF NOT EXISTS precio JSONB DEFAULT '{}'`);
  await config.pool.query(`CREATE INDEX IF NOT EXISTS idx_horarios_user_id ON horarios(user_id)`);

  // Índices
  await config.pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  await config.pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado)`);
  await config.pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_pasajero ON solicitudes(pasajero_id)`);
  await config.pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_conductor ON solicitudes(conductor_id)`);

  console.log('✅ Base de datos verificada/creada');
}

// Iniciar servidor con reintentos
async function startServer() {
  try {
    await initDB();
    app.listen(config.PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${config.PORT}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err.message);
    process.exit(1);
  }
}

startServer();