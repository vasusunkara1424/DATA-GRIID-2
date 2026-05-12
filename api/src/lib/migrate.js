import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../migrations');

export async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Create schema_migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read all migration files
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const version = parseInt(file.split('_')[0]);
      const name = file.replace('.sql', '');

      // Check if migration already ran
      const result = await pool.query('SELECT * FROM schema_migrations WHERE version = $1', [version]);
      
      if (result.rows.length > 0) {
        logger.info(`Migration ${version} already applied, skipping...`);
        continue;
      }

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`Running migration ${version}: ${name}`);
      await pool.query(sql);

      // Record migration
      await pool.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [version, name]);
      logger.info(`Migration ${version} completed successfully`);
    }

    logger.info('All migrations completed');
  } catch (error) {
    logger.error({ error: error.message }, 'Migration failed');
    process.exit(1);
  }
}
