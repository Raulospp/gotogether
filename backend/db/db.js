const { Pool } = require('pg');
const config = require('../src/config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('⚠️ Pool error (reconectando):', err.message);
});

module.exports = pool; 