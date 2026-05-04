/**
 * /api/usage — usage event tracking (for analytics / billing).
 */

import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/** POST /api/usage — log a usage event */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { userId, eventType, metadata } = req.body
    if (!userId) throw new ApiError(400, 'userId is required')
    if (!eventType) throw new ApiError(400, 'eventType is required')

    await req.dbClient.query(
      `INSERT INTO usage_events (user_id, event_type, metadata, workspace_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, eventType, JSON.stringify(metadata || {}), req.workspaceId]
    )
    res.status(201).json({ success: true })
  })
)

export default router
