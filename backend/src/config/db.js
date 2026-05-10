import pg from 'pg';
import { LIMITS } from '../constants/index.js';

const { Pool } = pg;

// Detectar SSL desde la URL directamente — más fiable que NODE_ENV
const sslRequired = process.env.DATABASE_URL?.includes('sslmode=require');

export const pool = new Pool({
  connectionString:     process.env.DATABASE_URL,
  ssl:                  sslRequired ? { rejectUnauthorized: false } : false,
  max:                  LIMITS.DB_POOL_MAX,
  idleTimeoutMillis:    LIMITS.DB_IDLE_TIMEOUT,
  connectionTimeoutMillis: LIMITS.DB_CONN_TIMEOUT,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de Postgres:', err.message);
});