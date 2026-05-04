/**
 * /api/sources — data source connectors.
 */

import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/** GET /api/sources — list all sources */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await req.dbClient.query(
      'SELECT * FROM sources ORDER BY created_at DESC NULLS LAST, id DESC'
    )
    res.json({ success: true, sources: rows })
  })
)

/** POST /api/sources — create a new source */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, type } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ApiError(400, 'name is required')
    }
    if (!type || typeof type !== 'string') {
      throw new ApiError(400, 'type is required (e.g. "database", "api", "storage")')
    }
    const { rows } = await req.dbClient.query(
      `INSERT INTO sources (name, type, status, workspace_id)
       VALUES ($1, $2, 'IDLE', $3) RETURNING *`,
      [name.trim(), type.trim(), req.workspaceId]
    )
    res.status(201).json({ success: true, source: rows[0] })
  })
)

/** DELETE /api/sources/:id */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'id must be a positive integer')
    }
    const { rowCount } = await req.dbClient.query('DELETE FROM sources WHERE id = $1', [id])
    if (rowCount === 0) throw new ApiError(404, `source ${id} not found`)
    res.json({ success: true })
  })
)

export default router
