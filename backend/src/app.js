import 'dotenv/config';
import express from 'express';
import cors    from 'cors';

import { logger }            from './config/logger.js';
import { waitForDB, initDB } from './utils/db.js';
import { errorHandler }      from './middlewares/error.middleware.js';
import { LIMITS }            from './constants/index.js';

import healthRouter     from './routes/health.route.js';
import authRouter       from './routes/auth.route.js';
import usersRouter      from './routes/users.route.js';
import solicitudesRouter from './routes/solicitudes.route.js';
import viajesRouter     from './routes/viajes.route.js';
import horariosRouter   from './routes/horarios.route.js';
import franjasRouter    from './routes/franjas.route.js';
import mapsRouter       from './routes/maps.route.js';
import pricingRouter    from './routes/price.route.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: LIMITS.JSON_BODY_LIMIT }));
app.use(logger.httpMiddleware);

// ─── Routers ──────────────────────────────────────────────────────────────────

app.use(healthRouter);                    // GET /health  y  GET /api/geocode (alias legacy)
app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/viajes',      viajesRouter);
app.use('/api/horarios',    horariosRouter);
app.use('/api/franjas',     franjasRouter);   // ◄ nuevo: franjas horarias por destino
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
      logger.info('Servidor corriendo', { port: PORT });
    });
  } catch (err) {
    logger.error('No se pudo iniciar el servidor', { message: err.message });
    process.exit(1);
  }
}

start();
