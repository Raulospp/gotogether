import 'dotenv/config';
import express from 'express';
import cors    from 'cors';

import { logger }            from './config/logger.js';
import { pool }              from './config/db.js';
import { waitForDB, initDB } from './utils/db.js';
import { getCoordinates }    from './services/maps.service.js';
import { errorHandler }      from './middlewares/error.middleware.js';
import { ok, fail }          from './utils/response.js';
import { LIMITS, HTTP }      from './constants/index.js';

import authRouter        from './routes/auth.js';
import usersRouter       from './routes/users.js';
import solicitudesRouter from './routes/solicitudes.js';
import viajesRouter      from './routes/viajes.js';
import horariosRouter    from './routes/horarios.js';
import mapsRouter        from './routes/maps.js';
import pricingRouter     from './routes/price.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: LIMITS.JSON_BODY_LIMIT }));
app.use(logger.httpMiddleware);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { db: 'ok', timestamp: new Date().toISOString() }, 'Servicio disponible');
  } catch {
    fail(res, HTTP.UNAVAILABLE, 'Base de datos no disponible', 'DB_UNREACHABLE');
  }
});

// ─── Alias de compatibilidad con el frontend ──────────────────────────────────
// MapaViaje.vue llama GET /api/geocode?q=... sin autenticación

app.get('/api/geocode', async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return fail(res, HTTP.BAD_REQUEST, 'Parámetro q requerido', 'MISSING_PARAM');
    ok(res, await getCoordinates(q), 'Coordenadas obtenidas');
  } catch (err) { next(err); }
});

// ─── Routers ──────────────────────────────────────────────────────────────────

app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/viajes',      viajesRouter);
app.use('/api/horarios',    horariosRouter);
app.use('/api/maps',        mapsRouter);
app.use('/api/pricing',     pricingRouter);

// ─── Error handler global (siempre al final) ──────────────────────────────────

app.use(errorHandler);

// ─── Arranque ─────────────────────────────────────────────────────────────────

async function start() {
  try {
    await waitForDB();
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Servidor corriendo`, { port: PORT });
    });
  } catch (err) {
    logger.error('No se pudo iniciar el servidor', { message: err.message });
    process.exit(1);
  }
}

start();
