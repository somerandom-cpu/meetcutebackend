/**
 * Database Health-Check & Schema Validator
 * ---------------------------------------
 * Runs through the expected tables/columns for MeetCute backend
 * and prints a clear report (OK / MISSING / TYPE MISMATCH).
 *
 * Usage: node dbHealthCheck.js
 */

const { Pool } = require('pg');
const env = require('../config/env');

// Expected schema definition (extend as your project grows)
const EXPECTED_SCHEMA = {
  users: {
    id: 'integer',
    email: 'character varying',
    password: 'character varying',
    role: 'character varying',
    is_email_verified: 'boolean',
    email_verification_code: 'character varying',
    email_verification_expires: 'timestamp without time zone',
    password_reset_token: 'character varying',
    password_reset_expires: 'timestamp without time zone',
  },
  // add other tables here as needed
};

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
    console.log(`🔍 Inspecting database \"${env.DB_NAME}\"...`);

    // Fetch all table -> column -> data_type
    const res = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public';
    `);
    const catalog = {};
    res.rows.forEach(({ table_name, column_name, data_type }) => {
      if (!catalog[table_name]) catalog[table_name] = {};
      catalog[table_name][column_name] = data_type;
    });

    let missingCount = 0;

    for (const [table, columns] of Object.entries(EXPECTED_SCHEMA)) {
      if (!catalog[table]) {
        console.warn(`❌ Table missing: ${table}`);
        missingCount++;
        continue;
      }

      for (const [col, expectedType] of Object.entries(columns)) {
        if (!catalog[table][col]) {
          console.warn(`❌ Column missing: ${table}.${col}`);
          missingCount++;
        } else if (catalog[table][col] !== expectedType) {
          console.warn(
            `⚠️  Type mismatch: ${table}.${col} expected ${expectedType} got ${catalog[table][col]}`
          );
        } else {
          console.log(`✅ ${table}.${col}`);
        }
      }
    }

    if (missingCount === 0) {
      console.log('\n🎉 Schema looks good!');
    } else {
      console.log(`\n⚠️  ${missingCount} missing items found – please migrate.`);
    }
  } catch (err) {
    console.error('❌ Health-check failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
