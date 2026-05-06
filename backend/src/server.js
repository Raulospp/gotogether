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

// Función para crear/verificar tablas (copia tu script original aquí)
async function initDB() {
  const client = await config.pool.connect();
  client.release();

  // ⚠️ PEGA AQUÍ TODAS LAS SENTENCIAS CREATE TABLE DE TU server.js ORIGINAL
  // (las de users, solicitudes, horarios, índices, etc.)
  // Ejemplo mínimo:
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
  // Agrega el resto de tablas (solicitudes, horarios) e índices
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