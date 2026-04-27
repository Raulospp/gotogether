import 'dotenv/config';
import express       from 'express';
import cors          from 'cors';

import { pool }      from './config/db.js';
import { waitForDB, initDB } from './utils/db.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import solicitudesRouter from './routes/solicitudes.js';
import viajesRouter from './routes/viajes.js';
import horariosRouter  from './routes/horarios.js';
import mapRouter  from './routes/map.js';
// ===============================
//  CONFIGURACIÓN
// ===============================
const app  = express();
const PORT = process.env.PORT || 3000;

// ===============================
//  MIDDLEWARES GLOBALES
// ===============================
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===============================
//  RUTAS
// ===============================
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/viajes',      viajesRouter);
app.use('/api/horarios',    horariosRouter);
app.use('/api/map',  mapRouter);
// ===============================
//  MANEJADOR DE ERRORES GLOBAL
// ===============================
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ===============================
//  ARRANQUE
// ===============================
async function start() {
  try {
    await waitForDB();
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(' No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
}

start();