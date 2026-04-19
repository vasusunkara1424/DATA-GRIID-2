/**
 * /api/alerts — monitoring alerts (anomaly detection).
 */

import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()

/** GET /api/alerts — latest 50 alerts (newest first) */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50'
    )
    res.json({ success: true, alerts: rows })
  })
)

/** PATCH /api/alerts/:id/resolve — mark an alert as resolved */
router.patch(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'id must be a positive integer')
    }
    const { rowCount } = await pool.query(
      'UPDATE alerts SET resolved = TRUE WHERE id = $1',
      [id]
    )
    if (rowCount === 0) throw new ApiError(404, `alert ${id} not found`)
    res.json({ success: true })
  })
)

export default router
