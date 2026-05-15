import { pool } from '../config/db.js';

export const HorarioRepository = {

  findByUserId: async (userId) => {
    const { rows } = await pool.query(
      'SELECT schedule, routes, precio FROM horarios WHERE user_id=$1',
      [userId],
    );
    return rows[0] ?? null;
  },

  findRoutesByUserId: async (userId) => {
    const { rows } = await pool.query(
      'SELECT routes FROM horarios WHERE user_id=$1',
      [userId],
    );
    return rows[0]?.routes ?? null;
  },

  findPrecioByUserId: async (userId) => {
    const { rows } = await pool.query(
      'SELECT precio FROM horarios WHERE user_id=$1',
      [userId],
    );
    return rows[0]?.precio ?? null;
  },

  // ── Upsert completo de los 3 campos (POST /horarios) ──────────────────────
  upsertFull: async (userId, { schedule = {}, routes = {}, precio = {} } = {}) => {
    await pool.query(`
      INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET schedule=$2, routes=$3, precio=$4, updated_at=NOW()
    `, [userId, JSON.stringify(schedule), JSON.stringify(routes), JSON.stringify(precio)]);
  },

  // ── Upsert parcial: solo actualiza los campos provistos ───────────────────
  upsertParcial: async (userId, fields) => {
    const setClauses = [];
    const values     = [userId];

    if (fields.schedule !== undefined)
      setClauses.push(`schedule=$${values.push(JSON.stringify(fields.schedule))}`);
    if (fields.routes !== undefined)
      setClauses.push(`routes=$${values.push(JSON.stringify(fields.routes))}`);
    if (fields.precio !== undefined)
      setClauses.push(`precio=$${values.push(JSON.stringify(fields.precio))}`);

    if (!setClauses.length) return;
    setClauses.push('updated_at=NOW()');

    const colNames       = Object.keys(fields).filter(k => ['schedule','routes','precio'].includes(k));
    const colPlaceholders = values.slice(1).map((_, i) => `$${i + 2}`).join(',');

    await pool.query(`
      INSERT INTO horarios (user_id, ${colNames.join(',')}, updated_at)
      VALUES ($1, ${colPlaceholders}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET ${setClauses.join(',')}
    `, values);
  },

  // ── Shortcuts semánticos ──────────────────────────────────────────────────
  upsertRoutes: async (userId, routes) => {
    await pool.query(`
      INSERT INTO horarios (user_id, routes, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET routes=$2, updated_at=NOW()
    `, [userId, JSON.stringify(routes)]);
  },

  upsertPrecio: async (userId, precio) => {
    await pool.query(`
      INSERT INTO horarios (user_id, precio, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET precio=$2, updated_at=NOW()
    `, [userId, JSON.stringify(precio)]);
  },
};
