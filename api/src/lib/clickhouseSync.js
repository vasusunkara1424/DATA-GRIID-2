import { createClient } from '@clickhouse/client'
import { pool } from '../db.js'
import logger from './logger.js'

// Postgres → Clickhouse type mapping
const typeMap = {
  'integer': 'Int32',
  'bigint': 'Int64',
  'smallint': 'Int16',
  'numeric': 'Float64',
  'real': 'Float32',
  'double precision': 'Float64',
  'character varying': 'String',
  'varchar': 'String',
  'text': 'String',
  'timestamp without time zone': 'DateTime',
  'timestamp with time zone': 'DateTime',
  'date': 'Date',
  'boolean': 'UInt8',
  'json': 'String',
  'jsonb': 'String',
}

export async function syncTableToClickhouse(sourceTable, destConfig) {
  const { host, port, database, username, password } = destConfig
  
  const chClient = createClient({
    host: `${host}:${port || 8123}`,
    database,
    username,
    password,
  })

  try {
    // 1. Get Postgres table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [sourceTable])

    const columns = schemaResult.rows.map(col => ({
      name: col.column_name,
      pgType: col.data_type,
      chType: typeMap[col.data_type] || 'String'
    }))

    // 2. Create Clickhouse table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${sourceTable} (
        ${columns.map(c => `${c.name} ${c.chType}`).join(', ')}
      ) ENGINE = MergeTree() ORDER BY tuple()
    `
    await chClient.command({ query: createTableSQL })
    logger.info({ sourceTable }, 'Clickhouse table created')

    // 3. Backfill data
    const dataResult = await pool.query(`SELECT * FROM ${sourceTable}`)
    if (dataResult.rows.length > 0) {
      await chClient.insert({
        table: sourceTable,
        values: dataResult.rows,
        format: 'JSONEachRow',
      })
      logger.info({ sourceTable, rowCount: dataResult.rows.length }, 'Data synced to Clickhouse')
    }

    await chClient.close()
    return { success: true, rowsSynced: dataResult.rows.length }
  } catch (err) {
    await chClient.close()
    logger.error({ err, sourceTable }, 'Clickhouse sync failed')
    throw err
  }
}
