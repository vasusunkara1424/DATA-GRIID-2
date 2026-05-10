import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../db.js'
import CDCEngine from '../lib/cdcEngine.js'
import { normalizeChange } from '../lib/decoderUtils.js'

const router = express.Router()
export const cdcEngine = new CDCEngine({ decoder: 'test_decoding' })
const cdcSubscribers = new Map()

router.post('/', async (req, res) => {
  try {
    const { name, type, config } = req.body
    const workspaceId = req.workspace?.id

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    if (!name || !type || !config) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!['postgres_cdc', 'mysql_cdc', 'mongodb_cdc'].includes(type)) {
      return res.status(400).json({ error: 'Invalid connector type' })
    }

    if (type === 'postgres_cdc') {
      const { host, port, database, user, password } = config
      if (!host || !database || !user || !password) {
        return res.status(400).json({
          error: 'Postgres CDC requires host, database, user, password',
        })
      }
    }

    const existingCheck = await pool.query(
      'SELECT id FROM connectors WHERE workspace_id = $1 AND name = $2',
      [workspaceId, name]
    )

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Connector with this name already exists' })
    }

    const connectorId = uuidv4()
    const result = await pool.query(
      'INSERT INTO connectors (id, workspace_id, name, type, config, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [connectorId, workspaceId, name, type, JSON.stringify(config), 'inactive']
    )

    let connector = result.rows[0]

    if (type === 'postgres_cdc') {
      const testResult = await cdcEngine.testConnection(config)
      if (!testResult.success) {
        await pool.query('DELETE FROM connectors WHERE id = $1', [connectorId])
        return res.status(400).json({
          error: 'Connection test failed',
          details: testResult.error,
        })
      }

      const slotResult = await cdcEngine.createReplicationSlot(config, connectorId, workspaceId)
      if (!slotResult.success) {
        await pool.query('DELETE FROM connectors WHERE id = $1', [connectorId])
        return res.status(400).json({
          error: 'Failed to create replication slot',
          details: slotResult.error,
        })
      }

      await pool.query(
        'UPDATE connectors SET replication_slot_name = $1, is_cdc_enabled = true WHERE id = $2',
        [slotResult.slotName, connectorId]
      )

      connector.replication_slot_name = slotResult.slotName
      connector.is_cdc_enabled = true
    }

    res.status(201).json({
      success: true,
      connector: serializeConnector(connector),
      message: `Connector "${name}" created successfully`,
    })
  } catch (error) {
    console.error('[Connectors] Create error:', error)
    res.status(500).json({ error: 'Failed to create connector' })
  }
})

router.post('/test', async (req, res) => {
  try {
    const { type, config } = req.body

    if (!type || !config) {
      return res.status(400).json({ error: 'Missing type or config' })
    }

    if (type !== 'postgres_cdc') {
      return res.status(400).json({ error: 'Only postgres_cdc is currently supported' })
    }

    const result = await cdcEngine.testConnection(config)
    res.json(result)
  } catch (error) {
    console.error('[Connectors] Test error:', error)
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message,
    })
  }
})

router.get('/', async (req, res) => {
  try {
    const workspaceId = req.workspace?.id

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    const result = await pool.query(
      'SELECT id, name, type, status, is_cdc_enabled, replication_slot_name, source_table_count, events_captured, last_synced_at, created_at, updated_at FROM connectors WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    )

    const connectors = result.rows.map(row => ({
      ...row,
      isStreaming: cdcEngine.isStreaming(row.id),
    }))

    res.json(connectors)
  } catch (error) {
    console.error('[Connectors] List error:', error)
    res.status(500).json({ error: 'Failed to list connectors' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const workspaceId = req.workspace?.id

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    const result = await pool.query('SELECT * FROM connectors WHERE id = $1 AND workspace_id = $2', [id, workspaceId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connector not found' })
    }

    const connector = result.rows[0]
    res.json({
      ...serializeConnector(connector),
      isStreaming: cdcEngine.isStreaming(id),
    })
  } catch (error) {
    console.error('[Connectors] Get error:', error)
    res.status(500).json({ error: 'Failed to fetch connector' })
  }
})

router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params
    const workspaceId = req.workspace?.id

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    const result = await pool.query('SELECT * FROM connectors WHERE id = $1 AND workspace_id = $2', [id, workspaceId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connector not found' })
    }

    const connector = result.rows[0]

    if (connector.type !== 'postgres_cdc') {
      return res.status(400).json({ error: 'Only postgres_cdc can stream' })
    }

    if (cdcEngine.isStreaming(id)) {
      return res.status(409).json({ error: 'CDC already streaming for this connector' })
    }

    const config = typeof connector.config === 'string' ? JSON.parse(connector.config) : connector.config

    try {
      await cdcEngine.startStreaming(id, config, connector.replication_slot_name, connector.last_lsn)

      await pool.query('UPDATE connectors SET status = $1, last_synced_at = NOW() WHERE id = $2', ['active', id])

      res.json({
        success: true,
        message: 'CDC streaming started',
      })
    } catch (err) {
      await pool.query('UPDATE connectors SET status = $1, error_message = $2 WHERE id = $3', ['error', err.message, id])
      throw err
    }
  } catch (error) {
    console.error('[Connectors] Start error:', error)
    res.status(500).json({
      error: 'Failed to start CDC',
      details: error.message,
    })
  }
})

router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params
    const workspaceId = req.workspace?.id

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    const result = await pool.query('SELECT id FROM connectors WHERE id = $1 AND workspace_id = $2', [id, workspaceId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connector not found' })
    }

    try {
      await cdcEngine.stopStreaming(id)
    } catch (err) {
      // OK if already stopped
    }

    await pool.query('UPDATE connectors SET status = $1 WHERE id = $2', ['inactive', id])

    res.json({
      success: true,
      message: 'CDC streaming stopped',
    })
  } catch (error) {
    console.error('[Connectors] Stop error:', error)
    res.status(500).json({ error: 'Failed to stop CDC' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const workspaceId = req.workspace?.id

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    const result = await pool.query('SELECT * FROM connectors WHERE id = $1 AND workspace_id = $2', [id, workspaceId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connector not found' })
    }

    const connector = result.rows[0]

    if (cdcEngine.isStreaming(id)) {
      await cdcEngine.stopStreaming(id)
    }

    if (connector.type === 'postgres_cdc' && connector.replication_slot_name) {
      const config = typeof connector.config === 'string' ? JSON.parse(connector.config) : connector.config
      await cdcEngine.dropReplicationSlot(config, connector.replication_slot_name)
    }

    await pool.query('DELETE FROM cdc_events WHERE connector_id = $1', [id])
    await pool.query('DELETE FROM connectors WHERE id = $1', [id])

    cdcSubscribers.delete(id)

    res.json({
      success: true,
      message: 'Connector deleted',
    })
  } catch (error) {
    console.error('[Connectors] Delete error:', error)
    res.status(500).json({ error: 'Failed to delete connector' })
  }
})

router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params
    const workspaceId = req.workspace?.id
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000)

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace context required' })
    }

    const verify = await pool.query('SELECT id FROM connectors WHERE id = $1 AND workspace_id = $2', [id, workspaceId])

    if (verify.rows.length === 0) {
      return res.status(404).json({ error: 'Connector not found' })
    }

    const result = await pool.query(
      'SELECT id, operation, table_name, schema_name, before_data, after_data, lsn, event_timestamp, captured_at FROM cdc_events WHERE connector_id = $1 ORDER BY captured_at DESC LIMIT $2',
      [id, limit]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('[Connectors] Events error:', error)
    res.status(500).json({ error: 'Failed to fetch CDC events' })
  }
})

function serializeConnector(connector) {
  return {
    id: connector.id,
    name: connector.name,
    type: connector.type,
    status: connector.status,
    isCdcEnabled: connector.is_cdc_enabled,
    replicationSlotName: connector.replication_slot_name,
    sourceTableCount: connector.source_table_count,
    eventsCaptured: connector.events_captured,
    lastSyncedAt: connector.last_synced_at,
    createdAt: connector.created_at,
    updatedAt: connector.updated_at,
    config:
      typeof connector.config === 'string'
        ? (() => {
            const cfg = JSON.parse(connector.config)
            const { password, ...safe } = cfg
            return safe
          })()
        : (() => {
            const { password, ...safe } = connector.config
            return safe
          })(),
  }
}

export function registerCDCSubscriber(connectorId, wsClient) {
  if (!cdcSubscribers.has(connectorId)) {
    cdcSubscribers.set(connectorId, new Set())
  }
  cdcSubscribers.get(connectorId).add(wsClient)
  console.log(`[CDC] Registered subscriber for ${connectorId}`)
}

export function unregisterCDCSubscriber(connectorId, wsClient) {
  const subscribers = cdcSubscribers.get(connectorId)
  if (subscribers) {
    subscribers.delete(wsClient)
    if (subscribers.size === 0) {
      cdcSubscribers.delete(connectorId)
    }
  }
}

export function broadcastCDCChange(connectorId, change) {
  const subscribers = cdcSubscribers.get(connectorId)
  if (!subscribers || subscribers.size === 0) return

  const message = JSON.stringify({
    type: 'cdc_change',
    connectorId,
    data: change,
  })

  subscribers.forEach(wsClient => {
    try {
      if (wsClient.readyState === 1) {
        wsClient.send(message)
      }
    } catch (err) {
      console.error('[CDC] Broadcast error:', err.message)
      unregisterCDCSubscriber(connectorId, wsClient)
    }
  })
}

export function setupCDCEventHandlers(cdcEngine, pool) {
  cdcEngine.on('change', async event => {
    const { connectorId, lsn, timestamp, change } = event

    const normalized = normalizeChange(change, lsn, timestamp)
    broadcastCDCChange(connectorId, normalized)

    try {
      await pool.query(
        'INSERT INTO cdc_events (connector_id, operation, table_name, schema_name, before_data, after_data, lsn, event_timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          connectorId,
          change.operation,
          change.table,
          change.schema,
          normalized.before ? JSON.stringify(normalized.before) : null,
          normalized.after ? JSON.stringify(normalized.after) : null,
          lsn,
          timestamp,
        ]
      )

      await pool.query('UPDATE connectors SET events_captured = events_captured + 1, last_lsn = $1 WHERE id = $2', [lsn, connectorId])
    } catch (err) {
      console.error('[CDC] Error persisting event:', err.message)
    }
  })

  cdcEngine.on('error', ({ connectorId, error }) => {
    console.error(`[CDC] Error in ${connectorId}:`, error.message)
    pool.query('UPDATE connectors SET status = $1, error_message = $2 WHERE id = $3', ['error', error.message, connectorId]).catch(() => {})
  })

  cdcEngine.on('stopped', ({ connectorId }) => {
    console.log(`[CDC] Stopped: ${connectorId}`)
    pool.query('UPDATE connectors SET status = $1 WHERE id = $2', ['inactive', connectorId]).catch(() => {})
  })
}

export default router
