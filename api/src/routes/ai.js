/**
 * /api/ai — AI-powered natural-language-to-SQL.
 */

import { Router } from 'express'
import OpenAI from 'openai'
import { readonlyPool } from '../db.js'
import { env } from '../config/env.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'

const router = Router()
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const BLOCKED_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER',
  'CREATE', 'GRANT', 'REVOKE', 'COPY', 'VACUUM', 'REINDEX',
]

function isSafeSelectQuery(sql) {
  const normalized = sql.trim().toUpperCase()
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
    return { safe: false, reason: 'Only SELECT queries are allowed' }
  }
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(sql)) {
      return { safe: false, reason: `Destructive keyword detected: ${keyword}` }
    }
  }
  if (/;\s*\S/.test(sql)) {
    return { safe: false, reason: 'Multiple statements are not allowed' }
  }
  return { safe: true }
}

router.post(
  '/sql',
  asyncHandler(async (req, res) => {
    const { question } = req.body
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new ApiError(400, 'question is required')
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a PostgreSQL expert. Convert the user's question to a single SELECT query.

Tables:
- pipelines (id, name, status, records, latency, created_at)
- sources (id, name, type, status, created_at)
- alerts (id, pipeline_id, type, message, severity, resolved, created_at)
- workspaces (id, name, slug, created_at)
- workspace_members (id, workspace_id, user_id, email, role, created_at)
- usage_events (id, user_id, event_type, metadata, created_at)

Rules:
- Return ONLY the raw SQL query — no markdown, no backticks, no explanation.
- Use only SELECT statements.
- Use standard PostgreSQL syntax.`,
        },
        { role: 'user', content: question },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const sql = raw.replace(/```sql/gi, '').replace(/```/g, '').trim()

    if (!sql) throw new ApiError(502, 'AI returned an empty query')

    const { safe, reason } = isSafeSelectQuery(sql)
    if (!safe) throw new ApiError(400, `Unsafe query rejected: ${reason}`, { sql })

    try {
      const result = await readonlyPool.query(sql)
      res.json({
        success: true,
        sql,
        rowCount: result.rowCount,
        rows: result.rows,
      })
    } catch (err) {
      throw new ApiError(400, `Query execution failed: ${err.message}`, { sql })
    }
  })
)

export default router
