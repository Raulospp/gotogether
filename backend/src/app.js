import 'dotenv/config';
import express       from "express";
import cors          from "cors";
 
import { pool }      from "./config/db.js";
import { waitForDB, initDB } from "./utils/db.js";
 
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import solicitudesRouter from './routes/solicitudes.js';
import viajesRouter from './routes/viajes.js';
import horariosRouter  from './routes/horarios.js';
import mapRouter  from './routes/maps.js';
import { getCoordinates } from './services/maps.service.js';
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
app.use('/api/maps',       mapRouter);
 
app.get('/api/geocode', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ message: 'Parámetro q requerido' });
    const result = await getCoordinates(String(q));
    res.json(result);
  } catch (err) { next(err); }
});
 
// ===============================
//  MANEJADOR DE ERRORES GLOBAL
// ===============================

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