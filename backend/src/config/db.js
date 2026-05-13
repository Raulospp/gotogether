import pg from "pg";
import { logger } from "./logger.js";
import { LIMITS } from "../constants/index.js";

const { Pool } = pg;

const sslRequired = process.env.DATABASE_URL?.includes('sslmode=require');

export const pool = new Pool({
  connectionString:           process.env.DATABASE_URL,
  ssl:                        sslRequired ? { rejectUnauthorized: false } : false,
  max:                        LIMITS.DB_POOL_MAX,
  idleTimeoutMillis:          LIMITS.DB_IDLE_TIMEOUT,
  connectionTimeoutMillis:    LIMITS.DB_CONN_TIMEOUT,
});

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de Postgres', { message: err.message });
});

