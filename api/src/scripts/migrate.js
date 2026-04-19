#!/usr/bin/env node
/**
 * Migration runner.
 * Runs every .sql file in ../migrations in alphabetical order.
 * Tracks which migrations have been applied in a schema_migrations table.
 * Skips migrations that have already run.
 *
 * Usage: npm run migrate
 */

import { readdirSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MIGRATIONS_DIR = join(__dirname, '../../migrations')

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

async function getAppliedMigrations() {
  const { rows } = await pool.query('SELECT filename FROM schema_migrations')
  return new Set(rows.map((r) => r.filename))
}

async function runMigration(filename) {
  const filePath = join(MIGRATIONS_DIR, filename)
  const sql = readFileSync(filePath, 'utf8')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename])
    await client.query('COMMIT')
    console.log(`  ✅ ${filename}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`  ❌ ${filename} — ${err.message}`)
    throw err
  } finally {
    client.release()
  }
}

async function main() {
  console.log('🔄 Running migrations...\n')

  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('  (no migration files found)')
    await pool.end()
    return
  }

  let ranCount = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ⏭  ${file} (already applied)`)
    } else {
      await runMigration(file)
      ranCount++
    }
  }

  console.log(`\n✨ Done. ${ranCount} new migration${ranCount === 1 ? '' : 's'} applied.`)
  await pool.end()
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err.message)
  process.exit(1)
})
