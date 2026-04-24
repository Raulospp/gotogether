import { pool } from '../config/db.js';

/** Reintenta conectar a la DB hasta maxRetries veces antes de fallar */
export async function waitForDB(maxRetries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log(`✅ Conexión a la DB establecida (intento ${attempt})`);
      return;
    } catch (err) {
      console.warn(`⏳ DB no disponible (intento ${attempt}/${maxRetries}): ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error('No se pudo conectar a la base de datos después de varios intentos');
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Agrega una columna solo si no existe */
export async function addColumnIfMissing(table, column, type) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn(`⚠️  No se pudo agregar columna ${column}: ${err.message}`);
    }
  }
}

/** Crea las tablas e índices necesarios */
export async function initDB() {
  // --- Tabla users ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(150) UNIQUE NOT NULL,
      password      TEXT NOT NULL,
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

  await addColumnIfMissing('users', 'vehicle_type', "VARCHAR(20) DEFAULT 'carro'");
  await addColumnIfMissing('users', 'capacity',     'INTEGER DEFAULT 4');
  await addColumnIfMissing('users', 'phone',        'VARCHAR(20)');
  await addColumnIfMissing('users', 'verified',     'BOOLEAN DEFAULT FALSE');
  await addColumnIfMissing('users', 'verify_token', 'TEXT');

  // --- Tabla solicitudes ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id            SERIAL PRIMARY KEY,
      pasajero_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      conductor_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      estado        VARCHAR(20)  DEFAULT 'pendiente',
      fecha_viaje   DATE         DEFAULT CURRENT_DATE,
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );
  `);

  await addColumnIfMissing('solicitudes', 'iniciado_por', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await addColumnIfMissing('solicitudes', 'fecha_viaje',  'DATE DEFAULT CURRENT_DATE');

  // --- Tabla horarios ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      schedule   JSONB DEFAULT '{}',
      routes     JSONB DEFAULT '{}',
      precio     JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await addColumnIfMissing('horarios', 'precio', "JSONB DEFAULT '{}'");

  // --- Índices ---
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_estado    ON solicitudes(estado);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_pasajero  ON solicitudes(pasajero_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_solicitudes_conductor ON solicitudes(conductor_id);`);

  console.log('✅ Base de datos lista');
}