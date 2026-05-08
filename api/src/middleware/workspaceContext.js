import { pool } from '../db.js'
import logger from '../lib/logger.js'
import { ApiError } from './errorHandler.js'

export async function withWorkspaceContext(req, res, next) {
  // Try to get userId from Clerk middleware first
  let userId = req.auth?.userId
  
  // If not found, try to extract from Authorization header
  if (!userId && req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '')
    // For now, we'll log the token to debug
    logger.info({ token: token.substring(0, 20) + '...' }, 'Token found in header')
  }
  
  if (!userId) {
    logger.warn({ auth: req.auth, hasAuthHeader: !!req.headers.authorization }, 'No userId found')
    return next(new ApiError(401, 'Not authenticated'))
  }

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
