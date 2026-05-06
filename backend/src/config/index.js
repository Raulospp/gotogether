require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('⚠️ Pool error (reconectando):', err.message);
});

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'cambiame_en_produccion',
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY || 'AIzaSyBVta3wPBhLml0Jr87iM8ij5j134BMeqqo',
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CALI_BOUNDS: '3.3,-76.6|3.6,-76.4',
  pool,            // 👈 exportamos el pool para usarlo en server.js y otros archivos
};