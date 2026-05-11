import { pool }   from '../config/db.js';
import { LIMITS } from '../constants/index.js';

// ─── Conexión ─────────────────────────────────────────────────────────────────

export async function waitForDB(
  maxRetries = LIMITS.DB_MAX_RETRIES,
  delayMs    = LIMITS.DB_RETRY_DELAY,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log(`✅ DB lista (intento ${attempt})`);
      return;
    } catch (err) {
      console.warn(`⏳ DB no disponible (${attempt}/${maxRetries}): ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error('No se pudo conectar a la base de datos');
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function createTableUsers() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(150) UNIQUE NOT NULL,
      password      TEXT         NOT NULL,
      role          VARCHAR(20)  DEFAULT 'pasajero',
      city          VARCHAR(100),
      university    VARCHAR(100),
      car_model     VARCHAR(100),
      plate         VARCHAR(20),
      route         VARCHAR(100),
      vehicle_type  VARCHAR(20)  DEFAULT 'carro',
      capacity      INTEGER      DEFAULT 4,
      phone         VARCHAR(20),
      verified      BOOLEAN      DEFAULT TRUE,
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );
  `);
}

async function createTableSolicitudes() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id            SERIAL PRIMARY KEY,
      pasajero_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      conductor_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      estado        VARCHAR(20)      DEFAULT 'pendiente',
      fecha_viaje   DATE             DEFAULT CURRENT_DATE,
      pickup_lat         DOUBLE PRECISION,
      pickup_lon         DOUBLE PRECISION,
      pickup_name        TEXT,
      pickup_direccion   TEXT,
      pickup_universidad TEXT,
      destino_lat        DOUBLE PRECISION,
      destino_lon        DOUBLE PRECISION,
      created_at    TIMESTAMPTZ      DEFAULT NOW()
    );
  `);
}

async function createTableHorarios() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      schedule   JSONB        DEFAULT '{}',
      routes     JSONB        DEFAULT '{}',
      precio     JSONB        DEFAULT '{}',
      updated_at TIMESTAMPTZ  DEFAULT NOW()
    );
  `);
}

async function createTableRefreshTokens() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER      REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      token      TEXT         UNIQUE NOT NULL,
      device     VARCHAR(200),
      expires_at TIMESTAMPTZ  NOT NULL,
      created_at TIMESTAMPTZ  DEFAULT NOW()
    );
  `);
}

async function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_role             ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_solicitudes_estado     ON solicitudes(estado)',
    'CREATE INDEX IF NOT EXISTS idx_solicitudes_pasajero   ON solicitudes(pasajero_id)',
    'CREATE INDEX IF NOT EXISTS idx_solicitudes_conductor  ON solicitudes(conductor_id)',
  ];

  await Promise.all(indexes.map((sql) => pool.query(sql)));
}

export async function initDB() {
  await createTableUsers();
  await createTableSolicitudes();
  await createTableHorarios();
  await createTableRefreshTokens();
  await createIndexes();
  console.log('✅ Base de datos lista');
}