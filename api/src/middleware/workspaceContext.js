import { pool } from '../db.js'
import logger from '../lib/logger.js'
import { ApiError } from './errorHandler.js'
import { verifyToken } from '@clerk/backend'

export async function withWorkspaceContext(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing authorization header'))
  }

  const token = authHeader.substring(7)
  let userId

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    userId = verified.sub
  } catch (err) {
    logger.warn({ err: err.message }, 'Token verification failed')
    return next(new ApiError(401, 'Invalid token'))
  }

  if (!userId) {
    return next(new ApiError(401, 'No user ID in token'))
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
    req.userId = userId

    res.on('finish', () => client.release())
    next()
  } catch (err) {
    logger.error({ err, userId }, 'Workspace context middleware failed')
    next(err)
  }
}
