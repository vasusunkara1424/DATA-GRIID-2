import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/**
 * POST /api/init/workspace
 * Auto-create default workspace for new users
 */
router.post(
  '/workspace',
  asyncHandler(async (req, res) => {
    const { userId, email } = req.body
    if (!userId || !email) {
      throw new ApiError(400, 'userId and email required')
    }

    // Check if user already has workspace
    const { rows: existing } = await pool.query(
      'SELECT workspace_id FROM workspace_members WHERE user_id = $1 LIMIT 1',
      [userId]
    )

    if (existing.length > 0) {
      return res.json({ success: true, message: 'Workspace already exists' })
    }

    // Create default workspace
    const { rows: wsRows } = await pool.query(
      'INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING *',
      [`${email}'s Workspace`, `workspace-${Date.now()}`]
    )

    // Add user as owner
    await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, email, role) VALUES ($1, $2, $3, $4)',
      [wsRows[0].id, userId, email, 'owner']
    )

    res.json({ success: true, workspace: wsRows[0] })
  })
)

export default router
