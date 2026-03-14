import pkg from "pg";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function initDB() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(20) DEFAULT 'pasajero',
      city VARCHAR(100),
      university VARCHAR(100),
      car_model VARCHAR(100),
      plate VARCHAR(20),
      route VARCHAR(100),
      vehicle_type VARCHAR(20),
      capacity INTEGER,
      verified BOOLEAN DEFAULT FALSE,
      verify_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity INTEGER`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT`);

  console.log("Tabla users lista");
}