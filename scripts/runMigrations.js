const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// List of error codes that are safe to skip (e.g., item already exists)
const SKIPPABLE_ERROR_CODES = [
  '42701', // duplicate column
  '42P07', // duplicate table/object
  '42710', // duplicate constraint name
  '23505', // unique constraint violation
  '23514', // check constraint violation
];

async function runMigrations() {
  console.log('Running migrations...');
  const migrationsDir = path.join(__dirname, '../migrations');
  let files;

  try {
    files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    console.error('❌ Could not read migrations directory:', err);
    process.exit(1);
  }

  for (const file of files) {
    const client = await pool.connect(); // Get a new client for each migration
    try {
      // Note: Some migration files manage their own transactions (BEGIN/COMMIT).
      // This script ensures each file runs in an isolated connection.
      const filePath = path.join(migrationsDir, file);
      console.log(`⚡️ Running migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`✅ Successfully applied: ${file}`);
    } catch (err) {
      if (SKIPPABLE_ERROR_CODES.includes(err.code)) {
        console.warn(`⚠️  Skipped (already applied): ${file} (${err.code})`);
      } else {
        console.error(`❌ Error running migration ${file}:`, err);
        console.error('Migration failed. Halting execution.');
        client.release();
        process.exit(1); // Exit on first real error
      }
    } finally {
      client.release(); // Release client
    }
  }

  console.log('🏁 All migrations attempted successfully.');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('❌ A critical error occurred in the migration runner:', err);
  process.exit(1);
});