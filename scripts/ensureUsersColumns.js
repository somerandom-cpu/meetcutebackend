// Generic migration/ensure script for `users` table columns.
// Usage: node ensureUsersColumns.js
// It connects using the same env config as your server (config/env.js)

const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
});

(async () => {
  const client = await pool.connect();
  try {
    const alterSql = `
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
        ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
    `;
    await client.query(alterSql);
    console.log('✅ Required user columns ensured.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
