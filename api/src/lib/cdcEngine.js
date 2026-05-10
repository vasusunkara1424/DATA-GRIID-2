import { EventEmitter } from 'events'
import pg from 'pg'
import { decodeLogicalChange } from './decoderUtils.js'

class CDCEngine extends EventEmitter {
  constructor(config = {}) {
    super()
    this.activeSessions = new Map()
    this.config = config
    this.defaultDecoder = config.decoder || 'test_decoding'
  }

  async testConnection(connectorConfig) {
    const client = new pg.Client({
      host: connectorConfig.host,
      port: connectorConfig.port || 5432,
      database: connectorConfig.database,
      user: connectorConfig.user,
      password: connectorConfig.password,
      ssl: connectorConfig.ssl !== false,
      statement_timeout: 5000,
    })

    try {
      await client.connect()
      const result = await client.query('SELECT version()')
      const serverVersion = result.rows[0].version

      const replResult = await client.query('SELECT setting FROM pg_settings WHERE name = $1', ['wal_level'])
      const walLevel = replResult.rows[0]?.setting

      if (walLevel !== 'logical') {
        throw new Error(`WAL level is '${walLevel}', not 'logical'. Enable logical replication: ALTER SYSTEM SET wal_level = logical; Then restart PostgreSQL.`)
      }

      return {
        success: true,
        message: 'Connection successful',
        version: serverVersion,
        wal_level: walLevel,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    } finally {
      await client.end()
    }
  }

  async createReplicationSlot(connectorConfig, connectorId, workspaceId) {
    const slotName = `datagriid_${workspaceId.toString().substring(0, 8)}_${connectorId.substring(0, 8)}`
    const client = new pg.Client({
      host: connectorConfig.host,
      port: connectorConfig.port || 5432,
      database: connectorConfig.database,
      user: connectorConfig.user,
      password: connectorConfig.password,
      ssl: connectorConfig.ssl !== false,
      replication: 'database',
    })

    try {
      await client.connect()

      const checkSlot = await client.query('SELECT slot_name FROM pg_replication_slots WHERE slot_name = $1', [slotName])

      if (checkSlot.rows.length > 0) {
        return {
          success: true,
          message: 'Replication slot already exists',
          slotName,
        }
      }

      await client.query(`CREATE_REPLICATION_SLOT ${slotName} LOGICAL ${this.defaultDecoder}`)

      return {
        success: true,
        message: 'Replication slot created',
        slotName,
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        return {
          success: true,
          message: 'Replication slot already exists',
          slotName,
        }
      }
      return {
        success: false,
        error: error.message,
        slotName,
      }
    } finally {
      await client.end()
    }
  }

  async startStreaming(connectorId, connectorConfig, slotName, lastLSN = null) {
    if (this.activeSessions.has(connectorId)) {
      throw new Error(`CDC already streaming for connector ${connectorId}`)
    }

    const client = new pg.Client({
      host: connectorConfig.host,
      port: connectorConfig.port || 5432,
      database: connectorConfig.database,
      user: connectorConfig.user,
      password: connectorConfig.password,
      ssl: connectorConfig.ssl !== false,
      replication: 'database',
      statement_timeout: 0,
    })

    try {
      await client.connect()

      const startLSN = lastLSN || '0/0'
      const streamCommand = `START_REPLICATION SLOT ${slotName} LOGICAL ${startLSN}`

      console.log(`[CDC] Starting stream for connector ${connectorId}, slot: ${slotName}, LSN: ${startLSN}`)

      this.activeSessions.set(connectorId, {
        client,
        slotName,
        isRunning: true,
        startTime: Date.now(),
      })

      client.on('replication', msg => {
        try {
          this._handleReplicationMessage(connectorId, msg)
        } catch (err) {
          console.error(`[CDC] Error processing message for ${connectorId}:`, err.message)
          this.emit('error', { connectorId, error: err })
        }
      })

      client.on('error', err => {
        console.error(`[CDC] Connection error for ${connectorId}:`, err.message)
        this.activeSessions.delete(connectorId)
        this.emit('error', { connectorId, error: err })
      })

      client.on('end', () => {
        console.log(`[CDC] Connection closed for ${connectorId}`)
        this.activeSessions.delete(connectorId)
        this.emit('stopped', { connectorId })
      })

      await client.query(streamCommand)
    } catch (error) {
      this.activeSessions.delete(connectorId)
      await client.end().catch(() => {})
      throw error
    }
  }

  _handleReplicationMessage(connectorId, msg) {
    if (msg.type === 'X') {
      const lsn = msg.wal.readUInt32BE(0) + '/' + msg.wal.readUInt32BE(4).toString(16)
      const walData = msg.wal.toString('utf8', 8)

      const change = decodeLogicalChange(walData)

      if (change) {
        this.emit('change', {
          connectorId,
          lsn,
          timestamp: msg.serverTime,
          change,
        })

        const session = this.activeSessions.get(connectorId)
        if (session) {
          this._sendKeepalive(session.client, lsn)
        }
      }
    } else if (msg.type === 'k') {
      const session = this.activeSessions.get(connectorId)
      if (session && msg.mustReply) {
        this._sendKeepalive(session.client, msg.wal)
      }
    }
  }

  _sendKeepalive(client, lsn) {
    try {
      const buf = Buffer.alloc(34)
      buf[0] = 'r'.charCodeAt(0)
      buf.writeUInt32BE(0, 1)
      buf.writeUInt32BE(lsn, 5)
      buf.writeUInt32BE(0, 9)
      buf.writeUInt32BE(lsn, 13)
      buf.writeBigInt64BE(BigInt(Date.now() * 1000), 17)
      buf[25] = 0

      client.query('SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), $1::pg_lsn)', [lsn]).catch(() => {})
    } catch (err) {
      // Silently ignore
    }
  }

  async stopStreaming(connectorId) {
    const session = this.activeSessions.get(connectorId)
    if (!session) {
      throw new Error(`No active CDC session for connector ${connectorId}`)
    }

    console.log(`[CDC] Stopping stream for connector ${connectorId}`)
    session.isRunning = false

    try {
      await session.client.end()
    } catch (err) {
      console.error(`[CDC] Error stopping ${connectorId}:`, err.message)
    }

    this.activeSessions.delete(connectorId)
    this.emit('stopped', { connectorId })
  }

  async dropReplicationSlot(connectorConfig, slotName) {
    const client = new pg.Client({
      host: connectorConfig.host,
      port: connectorConfig.port || 5432,
      database: connectorConfig.database,
      user: connectorConfig.user,
      password: connectorConfig.password,
      ssl: connectorConfig.ssl !== false,
      replication: 'database',
    })

    try {
      await client.connect()
      await client.query(`DROP_REPLICATION_SLOT ${slotName}`)
      return {
        success: true,
        message: `Replication slot ${slotName} dropped`,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    } finally {
      await client.end()
    }
  }

  getActiveSessions() {
    const sessions = []
    for (const [connectorId, session] of this.activeSessions) {
      sessions.push({
        connectorId,
        slotName: session.slotName,
        isRunning: session.isRunning,
        uptime: Date.now() - session.startTime,
      })
    }
    return sessions
  }

  isStreaming(connectorId) {
    const session = this.activeSessions.get(connectorId)
    return session ? session.isRunning : false
  }
}

export default CDCEngine
