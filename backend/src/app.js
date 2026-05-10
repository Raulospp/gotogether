import 'dotenv/config';
import express from 'express';
import cors    from 'cors';

import { pool }             from './config/db.js';
import { waitForDB, initDB } from './utils/db.js';
import { getCoordinates }   from './services/maps.service.js';
import { LIMITS }           from './constants/index.js';

import authRouter        from './routes/auth.js';
import usersRouter       from './routes/users.js';
import solicitudesRouter from './routes/solicitudes.js';
import viajesRouter      from './routes/viajes.js';
import horariosRouter    from './routes/horarios.js';
import mapsRouter        from './routes/maps.js';

// ─── App ──────────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: LIMITS.JSON_BODY_LIMIT }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

// ─── Alias de compatibilidad con el frontend ──────────────────────────────────
// MapaViaje.vue llama GET /api/geocode?q=... sin autenticación

app.get('/api/geocode', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ message: 'Parámetro q requerido' });
    res.json(await getCoordinates(String(q)));
  } catch (err) { next(err); }
});

// ─── Routers ──────────────────────────────────────────────────────────────────

app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/viajes',      viajesRouter);
app.use('/api/horarios',    horariosRouter);
app.use('/api/maps',        mapsRouter);

// ─── Error handler global ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────

async function start() {
  try {
    await waitForDB();
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ No se pudo iniciar:', err.message);
    process.exit(1);
  }
}

start();