/**
 * /api/pipelines — CRUD for data pipelines.
 */

import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/** GET /api/pipelines — list all pipelines, newest first */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM pipelines ORDER BY created_at DESC NULLS LAST, id DESC'
    )
    res.json({ success: true, pipelines: rows })
  })
)

/** POST /api/pipelines — create a pipeline */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ApiError(400, 'name is required and must be a non-empty string')
    }
    const { rows } = await pool.query(
      `INSERT INTO pipelines (name, status, records, latency)
       VALUES ($1, 'Scheduled', 0, 0) RETURNING *`,
      [name.trim()]
    )
    res.status(201).json({ success: true, pipeline: rows[0] })
  })
)

/** DELETE /api/pipelines/:id */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'id must be a positive integer')
    }
    const { rowCount } = await pool.query('DELETE FROM pipelines WHERE id = $1', [id])
    if (rowCount === 0) throw new ApiError(404, `pipeline ${id} not found`)
    res.json({ success: true })
  })
)

export default router
