const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl, ssl: process.env.DB_SSL === 'true' });

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run_migration.js <migration-file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(__dirname, migrationFile), 'utf8');

(async () => {
  try {
    await pool.query(sql);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
