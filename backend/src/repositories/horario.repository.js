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

  upsert: async (userId, { schedule, routes, precio }) => {
    const fields = [];
    const values = [userId];

    if (schedule !== undefined) { fields.push(`schedule=$${values.push(JSON.stringify(schedule))}`); }
    if (routes   !== undefined) { fields.push(`routes=$${values.push(JSON.stringify(routes))}`);   }
    if (precio   !== undefined) { fields.push(`precio=$${values.push(JSON.stringify(precio))}`);   }

    fields.push(`updated_at=NOW()`);

    await pool.query(`
      INSERT INTO horarios (user_id, ${['schedule','routes','precio'].filter((_,i) => [schedule,routes,precio][i] !== undefined).join(',')}, updated_at)
      VALUES ($1, ${values.slice(1).map((_,i) => `$${i+2}`).join(',')}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET ${fields.join(',')}
    `, values);
  },

  upsertFull: async (userId, schedule, routes, precio) => {
    await pool.query(`
      INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET schedule=$2, routes=$3, precio=$4, updated_at=NOW()
    `, [userId, JSON.stringify(schedule), JSON.stringify(routes), JSON.stringify(precio)]);
  },

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
