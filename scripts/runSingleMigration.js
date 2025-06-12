const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration(file) {
  const client = await pool.connect();
  try {
    console.log(`⚡️ Running migration: ${file}`);
    const filePath = path.join(__dirname, '../migrations', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log(`✅ Successfully applied: ${file}`);
  } catch (err) {
    console.error(`❌ Error running migration ${file}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

// Get the migration file from command line arguments
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please provide a migration file name as an argument');
  process.exit(1);
}

runMigration(migrationFile)
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
