/**
 * /api/stats — aggregate counts and user-specific stats.
 */

import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/** GET /api/stats — global counts (pipelines + sources) */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [pipelines, sources] = await Promise.all([
      req.dbClient.query('SELECT COUNT(*)::int AS count FROM pipelines'),
      req.dbClient.query('SELECT COUNT(*)::int AS count FROM sources'),
    ])
    res.json({
      success: true,
      stats: {
        pipelines: pipelines.rows[0].count,
        sources: sources.rows[0].count,
      },
    })
  })
)

/** GET /api/stats/user/:userId — full stats for a specific user */
router.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId || userId.trim().length === 0) {
      throw new ApiError(400, 'userId is required')
    }

    const [pipelines, sources, alerts, aiQueries, recentEvents] = await Promise.all([
      req.dbClient.query('SELECT COUNT(*)::int AS count FROM pipelines'),
      req.dbClient.query('SELECT COUNT(*)::int AS count FROM sources'),
      req.dbClient.query('SELECT COUNT(*)::int AS count FROM alerts WHERE resolved = FALSE'),
      req.dbClient.query(
        `SELECT COUNT(*)::int AS count FROM usage_events
         WHERE user_id = $1 AND event_type = 'ai_query'`,
        [userId]
      ),
      req.dbClient.query(
        `SELECT * FROM usage_events
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      ),
    ])

    res.json({
      success: true,
      stats: {
        pipelines: pipelines.rows[0].count,
        sources: sources.rows[0].count,
        activeAlerts: alerts.rows[0].count,
        aiQueries: aiQueries.rows[0].count,
        recentEvents: recentEvents.rows,
      },
    })
  })
)

export default router
