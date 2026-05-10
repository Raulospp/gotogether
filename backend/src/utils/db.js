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

// ─── Migraciones ──────────────────────────────────────────────────────────────

export async function addColumnIfMissing(table, column, type) {
  try {
    await pool.query(
      `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`,
    );
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn(`⚠️  No se pudo agregar ${table}.${column}: ${err.message}`);
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
      verified      BOOLEAN      DEFAULT FALSE,
      verify_token  TEXT,
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );
  `);

  // Columnas agregadas en versiones posteriores
  await addColumnIfMissing('users', 'vehicle_type', "VARCHAR(20) DEFAULT 'carro'");
  await addColumnIfMissing('users', 'capacity',     'INTEGER DEFAULT 4');
  await addColumnIfMissing('users', 'phone',        'VARCHAR(20)');
  await addColumnIfMissing('users', 'verified',     'BOOLEAN DEFAULT FALSE');
  await addColumnIfMissing('users', 'verify_token', 'TEXT');
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
      created_at    TIMESTAMPTZ      DEFAULT NOW()
    );
  `);

  await addColumnIfMissing('solicitudes', 'iniciado_por',       'INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await addColumnIfMissing('solicitudes', 'fecha_viaje',        'DATE DEFAULT CURRENT_DATE');
  await addColumnIfMissing('solicitudes', 'pickup_lat',         'DOUBLE PRECISION');
  await addColumnIfMissing('solicitudes', 'pickup_lon',         'DOUBLE PRECISION');
  await addColumnIfMissing('solicitudes', 'pickup_name',        'TEXT');
  await addColumnIfMissing('solicitudes', 'pickup_direccion',   'TEXT');
  await addColumnIfMissing('solicitudes', 'pickup_universidad', 'TEXT');
  await addColumnIfMissing('solicitudes', 'destino_lat',        'DOUBLE PRECISION');
  await addColumnIfMissing('solicitudes', 'destino_lon',        'DOUBLE PRECISION');
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

  await addColumnIfMissing('horarios', 'precio', "JSONB DEFAULT '{}'");
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