/**
 * Anomaly detector.
 * Runs every N seconds (set by ANOMALY_INTERVAL_MS in .env).
 * Inspects every pipeline for issues (errors, high latency, no records)
 * and inserts alerts for any NEW problem. Also broadcasts alerts via WebSocket.
 */

import { pool } from '../db.js'
import { env } from '../config/env.js'
import { broadcast } from '../websocket.js'

let intervalHandle = null

/** Check a single pipeline and return a list of issues found. */
function inspectPipeline(pipeline) {
  const issues = []

  if (pipeline.status === 'error') {
    issues.push({
      type: 'pipeline_error',
      severity: 'critical',
      message: `Pipeline "${pipeline.name}" is in error state`,
    })
  }

  if (pipeline.latency != null && pipeline.latency > 100) {
    issues.push({
      type: 'high_latency',
      severity: 'warning',
      message: `Pipeline "${pipeline.name}" has high latency: ${pipeline.latency}ms`,
    })
  }

  if (pipeline.records === 0) {
    issues.push({
      type: 'no_records',
      severity: 'critical',
      message: `Pipeline "${pipeline.name}" has zero records — possible data loss`,
    })
  }

  return issues
}

/** One detection pass — runs through every pipeline once. */
export async function detectAnomalies() {
  try {
    const { rows: pipelines } = await pool.query('SELECT * FROM pipelines')

    for (const pipeline of pipelines) {
      const issues = inspectPipeline(pipeline)

      for (const issue of issues) {
        // Only insert if an identical UNRESOLVED alert doesn't already exist
        const { rows: existing } = await pool.query(
          `SELECT id FROM alerts
           WHERE pipeline_id = $1 AND type = $2 AND resolved = FALSE
           LIMIT 1`,
          [pipeline.id, issue.type]
        )
        if (existing.length > 0) continue

        const { rows: inserted } = await pool.query(
          `INSERT INTO alerts (pipeline_id, type, message, severity)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [pipeline.id, issue.type, issue.message, issue.severity]
        )

        console.log(`🚨 Anomaly: ${issue.message}`)
        broadcast({ type: 'alert', alert: inserted[0] })
      }
    }
  } catch (err) {
    console.error('❌ Anomaly detection failed:', err.message)
  }
}

/** Start the periodic anomaly detector. Call once from src/index.js. */
export function startAnomalyDetector() {
  if (env.ANOMALY_INTERVAL_MS === 0) {
    console.log('⏸  Anomaly detector disabled (ANOMALY_INTERVAL_MS=0)')
    return
  }
  // Run once immediately, then on an interval
  detectAnomalies()
  intervalHandle = setInterval(detectAnomalies, env.ANOMALY_INTERVAL_MS)
  const seconds = Math.round(env.ANOMALY_INTERVAL_MS / 1000)
  console.log(`🔎 Anomaly detector running every ${seconds}s`)
}

/** Stop the detector. Called on graceful shutdown. */
export function stopAnomalyDetector() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
    console.log('✅ Anomaly detector stopped')
  }
}
