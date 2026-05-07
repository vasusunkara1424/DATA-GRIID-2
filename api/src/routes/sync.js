import { Router } from 'express'
import { syncTableToClickhouse } from '../lib/clickhouseSync.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.post('/:destinationId', asyncHandler(async (req, res) => {
  const { sourceTable = 'pipelines' } = req.body
  // TODO: implement ClickHouse sync when service is running
  res.json({ 
    success: true, 
    message: 'Sync endpoint acknowledged (ClickHouse not yet deployed)',
    destinationId: req.params.destinationId,
    sourceTable
  })
}))

export default router
