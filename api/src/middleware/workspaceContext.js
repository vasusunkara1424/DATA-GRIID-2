import { pool } from '../db.js'
import logger from '../lib/logger.js'
import { ApiError } from './errorHandler.js'

export async function withWorkspaceContext(req, res, next) {
  const userId = req.auth?.userId
  if (!userId) return next(new ApiError(401, 'Not authenticated'))

  try {
    const { rows } = await pool.query(
      'SELECT workspace_id FROM workspace_members WHERE user_id = $1 LIMIT 1',
      [userId]
    )
    if (!rows.length) return next(new ApiError(403, 'No workspace assigned'))

    const workspaceId = rows[0].workspace_id
    const client = await pool.connect()
    await client.query(`SET LOCAL app.current_workspace = '${workspaceId}'`)

    req.workspaceId = workspaceId
    req.dbClient = client

    res.on('finish', () => client.release())
    next()
  } catch (err) {
    logger.error({ err, userId }, 'Workspace context middleware failed')
    next(err)
  }
}
