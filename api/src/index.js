/**
 * DataGrid API — main entry point.
 * Boots the HTTP server, WebSocket server, database pool, and anomaly detector.
 * Handles graceful shutdown on SIGINT/SIGTERM.
 */

import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { pool, verifyConnection } from './db.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import { generalLimiter, aiLimiter } from './middleware/rateLimit.js'
import { startWebSocket, closeWebSocket, getClientCount } from './websocket.js'
import { startAnomalyDetector, stopAnomalyDetector } from './lib/anomalyDetector.js'

// Routes
import pipelinesRouter from './routes/pipelines.js'
import sourcesRouter from './routes/sources.js'
import statsRouter from './routes/stats.js'
import alertsRouter from './routes/alerts.js'
import workspacesRouter from './routes/workspaces.js'
import usageRouter from './routes/usage.js'
import aiRouter from './routes/ai.js'

const app = express()

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(generalLimiter)

// ─── Health check ────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ name: 'DataGrid API', version: '1.0.0', status: 'ok', env: env.NODE_ENV })
})

app.get('/health', async (_req, res) => {
  try {
    const info = await verifyConnection()
    res.json({
      status: 'ok',
      database: info,
      websocketClients: getClientCount(),
    })
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message })
  }
})

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/api/pipelines', pipelinesRouter)
app.use('/api/sources', sourcesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/workspaces', workspacesRouter)
app.use('/api/usage', usageRouter)
app.use('/api/ai', aiLimiter, aiRouter)

// ─── Error handlers (must be LAST) ───────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

// ─── Server startup ──────────────────────────────────────────────────────
async function start() {
  try {
    const dbInfo = await verifyConnection()
    console.log(`🗄️  Connected to ${dbInfo.version}`)
  } catch (err) {
    console.error('❌ Database connection failed on startup:', err.message)
    process.exit(1)
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 DataGrid API listening on http://localhost:${env.PORT}`)
    console.log(`   environment: ${env.NODE_ENV}`)
  })

  startWebSocket(server)
  startAnomalyDetector()

  // ─── Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`)
    stopAnomalyDetector()
    server.close(async () => {
      await closeWebSocket()
      await pool.end()
      console.log('✅ All services stopped')
      process.exit(0)
    })
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after 10s timeout')
      process.exit(1)
    }, 10_000)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
