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
import { withWorkspaceContext } from './middleware/workspaceContext.js'
import { generalLimiter, aiLimiter } from './middleware/rateLimit.js'
import logger from './lib/logger.js'
import pinoHttp from 'pino-http'
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
import destinationsRouter from './routes/destinations.js'
// import syncRouter from './routes/sync.js'

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
app.use(pinoHttp({ logger, customLogLevel: (req, res, err) => { if (res.statusCode >= 500 || err) return 'error'; if (res.statusCode >= 400) return 'warn'; return 'info' } }))

// ─── Health check ────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ name: 'DataGrid API', version: '1.0.0', status: 'ok', env: env.NODE_ENV })
})

// Liveness check — am I running? (used by Railway, load balancers)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// Readiness check — can I serve real traffic? (checks downstream deps)
app.get('/health/ready', async (_req, res) => {
  const checks = {}
  let overallOk = true

  try {
    const start = Date.now()
    const info = await verifyConnection()
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - start,
      version: info.version,
    }
  } catch (err) {
    overallOk = false
    checks.database = { status: 'error', error: err.message }
  }

  checks.websocket = {
    status: 'ok',
    clients: getClientCount(),
  }

  const mem = process.memoryUsage()
  checks.memory = {
    rssMB: Math.round(mem.rss / 1024 / 1024),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
  }

  res.status(overallOk ? 200 : 503).json({
    status: overallOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    version: '1.0.0',
    checks,
    timestamp: new Date().toISOString(),
  })
})

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/api/pipelines', withWorkspaceContext, pipelinesRouter)
app.use('/api/sources', withWorkspaceContext, sourcesRouter)
app.use('/api/stats', withWorkspaceContext, statsRouter)
app.use('/api/alerts', withWorkspaceContext, alertsRouter)
app.use('/api/workspaces', workspacesRouter)
app.use('/api/usage', withWorkspaceContext, usageRouter)
app.use('/api/ai', aiLimiter, withWorkspaceContext, aiRouter)
app.use('/api/destinations', withWorkspaceContext, destinationsRouter)
app.use('//api/sync', withWorkspaceContext, syncRouter)revierw 
// ─── Error handlers (must be LAST) ───────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

// ─── Server startup ──────────────────────────────────────────────────────
async function start() {
  try {
    const dbInfo = await verifyConnection()
    logger.info({ dbVersion: dbInfo.version }, "Database connected")
  } catch (err) {
    logger.fatal({ err: err.message }, "Database connection failed on startup")
    process.exit(1)
  }

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API server started')
  })

  startWebSocket(server)
  startAnomalyDetector()

  // ─── Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.warn({ signal }, 'Shutdown signal received')
    stopAnomalyDetector()
    server.close(async () => {
      await closeWebSocket()
      await pool.end()
      logger.info('All services stopped cleanly')
      process.exit(0)
    })
    setTimeout(() => {
      logger.fatal('Forced shutdown after 10s timeout')
      process.exit(1)
    }, 10_000)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
