import { Router } from 'express';
import { pool }          from '../config/db.js';
import { getCoordinates } from '../services/maps.service.js';
import { ok, fail }      from '../utils/response.js';
import { HTTP }          from '../constants/index.js';

const router = Router();

// ─── Health check ─────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { db: 'ok', timestamp: new Date().toISOString() }, 'Servicio disponible');
  } catch {
    fail(res, HTTP.UNAVAILABLE, 'Base de datos no disponible', 'DB_UNREACHABLE');
  }
});

// ─── Alias de compatibilidad con el frontend ──────────────────────────────────
// MapaViaje.vue llama GET /api/geocode?q=... sin autenticación
router.get('/api/geocode', async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return fail(res, HTTP.BAD_REQUEST, 'Parámetro q requerido', 'MISSING_PARAM');
    ok(res, await getCoordinates(q), 'Coordenadas obtenidas');
  } catch (err) { next(err); }
});

export default router;
