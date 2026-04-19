/**
 * /api/workspaces — team workspaces and members.
 */

import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/** Helper — turn a name like "Acme Corp" into a unique-ish slug */
function slugify(name) {
  return (
    name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') +
    '-' +
    Date.now()
  )
}

/** GET /api/workspaces — list all workspaces */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM workspaces ORDER BY created_at DESC'
    )
    res.json({ success: true, workspaces: rows })
  })
)

/** GET /api/workspaces/user/:userId — workspaces the user belongs to */
router.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId) throw new ApiError(400, 'userId is required')
    const { rows } = await pool.query(
      `SELECT w.*, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    )
    res.json({ success: true, workspaces: rows })
  })
)

/** POST /api/workspaces — create workspace + add creator as owner */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, userId, email } = req.body
    if (!name || name.trim().length === 0) {
      throw new ApiError(400, 'name is required')
    }
    if (!userId) throw new ApiError(400, 'userId is required')
    if (!email) throw new ApiError(400, 'email is required')

    const slug = slugify(name)

    // Transaction: create workspace + owner member atomically
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: wsRows } = await client.query(
        'INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING *',
        [name.trim(), slug]
      )
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, email, role)
         VALUES ($1, $2, $3, 'owner')`,
        [wsRows[0].id, userId, email]
      )
      await client.query('COMMIT')
      res.status(201).json({ success: true, workspace: wsRows[0] })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })
)

/** GET /api/workspaces/:id/members — list all members */
router.get(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'id must be a positive integer')
    }
    const { rows } = await pool.query(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 ORDER BY created_at NULLS LAST, id',
      [id]
    )
    res.json({ success: true, members: rows })
  })
)

/** POST /api/workspaces/:id/invite — invite a new member by email */
router.post(
  '/:id/invite',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const { email } = req.body
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'id must be a positive integer')
    }
    if (!email) throw new ApiError(400, 'email is required')

    // Check workspace exists
    const { rowCount } = await pool.query('SELECT 1 FROM workspaces WHERE id = $1', [id])
    if (rowCount === 0) throw new ApiError(404, `workspace ${id} not found`)

    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, email, role)
       VALUES ($1, 'pending', $2, 'member')`,
      [id, email]
    )
    res.status(201).json({ success: true, message: `${email} invited` })
  })
)

export default router
