import { Router } from 'express'
import { createClient } from '@clickhouse/client'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

// POST /api/destinations - Create destination
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, config } = req.body
  if (!name || !type || !config) {
    throw new ApiError(400, 'name, type, and config are required')
  }

  const { rows } = await req.dbClient.query(
    `INSERT INTO destinations (workspace_id, name, type, config, status)
     VALUES ($1, $2, $3, $4, 'idle') RETURNING *`,
    [req.workspaceId, name, type, JSON.stringify(config)]
  )
  res.status(201).json({ success: true, destination: rows[0] })
}))

// GET /api/destinations - List destinations
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await req.dbClient.query('SELECT * FROM destinations ORDER BY created_at DESC')
  res.json({ success: true, destinations: rows })
}))

// POST /api/destinations/test-clickhouse - Test Clickhouse connection
router.post('/test-clickhouse', asyncHandler(async (req, res) => {
  const { host, port, database, username, password } = req.body
  
  const client = createClient({
    host: `${host}:${port || 8123}`,
    database,
    username,
    password,
  })

  try {
    const result = await client.query({ query: 'SELECT version()' })
    const data = await result.json()
    await client.close()
    res.json({ success: true, version: data.data[0].version })
  } catch (err) {
    await client.close()
    throw new ApiError(500, `Clickhouse connection failed: ${err.message}`)
  }
}))


// POST /api/destinations/:id/sync - Trigger sync
router.post('/:id/sync', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { sourceTable } = req.body

  if (!sourceTable) throw new ApiError(400, 'sourceTable is required')

  const { rows } = await req.dbClient.query(
    'SELECT * FROM destinations WHERE id = $1',
    [id]
  )
  if (!rows.length) throw new ApiError(404, 'Destination not found')

  const destination = rows[0]
  const destConfig = JSON.parse(destination.config)

  // Import sync engine
  const { syncTableToClickhouse } = await import('../lib/clickhouseSync.js')
  
  const result = await syncTableToClickhouse(sourceTable, destConfig)

  await req.dbClient.query(
    'UPDATE destinations SET status = $1, last_sync_at = NOW() WHERE id = $2',
    ['idle', id]
  )

  res.json({ success: true, ...result })
}))

export default router
