import { Router } from 'express'
import { syncTableToClickhouse } from '../lib/clickhouseSync.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.post('/:destinationId/sync', asyncHandler(async (req, res) => {
  const { sourceTable = 'pipelines' } = req.body
  
  const result = await syncTableToClickhouse(sourceTable, {
    host: process.env.CLICKHOUSE_HOST,
    port: process.env.CLICKHOUSE_PORT,
    database: process.env.CLICKHOUSE_DATABASE,
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD
  })
  
  res.json({ success: true, result })
}))

export default router
