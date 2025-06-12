// Migration script to add email verification code columns to users table
// Usage: node addEmailVerificationColumns.js

const { Pool } = require('pg');

// Update connection details if necessary
const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'meetcute',
});

(async () => {
  const client = await pool.connect();
  try {
    const alterSql = `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
    `;
    await client.query(alterSql);
    console.log('Columns email_verification_code and email_verification_expires ensured.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
