/**
 * PostgreSQL connection pool.
 * A single pool is shared across the entire app — do not create new pools in route files.
 * Graceful shutdown is handled in src/index.js.
 */

import pg from 'pg'
import { env } from './config/env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Optional read-only pool for AI queries (if DATABASE_URL_READONLY is set)
export const readonlyPool = env.DATABASE_URL_READONLY
  ? new Pool({
      connectionString: env.DATABASE_URL_READONLY,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : pool // fallback to main pool if no read-only URL provided

pool.on('error', (err) => {
  console.error('❌ Unexpected Postgres pool error:', err.message)
})

/**
 * Small helper to run a query with automatic error logging.
 * Route files can use either this or `pool.query()` directly.
 */
export async function query(text, params) {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 80))
    }
    return result
  } catch (err) {
    console.error('❌ Query failed:', err.message, '| SQL:', text.substring(0, 80))
    throw err
  }
}

/**
 * Verify the database connection on startup.
 * Call this once in src/index.js — throws if DB is unreachable.
 */
export async function verifyConnection() {
  const { rows } = await pool.query('SELECT NOW() as now, version() as version')
  return {
    timestamp: rows[0].now,
    version: rows[0].version.split(' ')[0] + ' ' + rows[0].version.split(' ')[1],
  }
}
