/**
 * Environment configuration with validation.
 * Loads variables from .env and validates them using zod.
 * The server will refuse to start if any required variable is missing or malformed.
 */

import dotenv from 'dotenv'
import { z } from 'zod'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from the api/ root (two levels up from src/config/)
dotenv.config({ path: resolve(__dirname, '../../.env') })

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WS_PORT: z.coerce.number().int().positive().default(4001),

  // Database
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid postgres URL' }),
  DATABASE_URL_READONLY: z.string().url().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-', { message: 'OPENAI_API_KEY must start with sk-' }),

  // CORS (comma-separated origins, or * for all)
  CORS_ORIGIN: z.string().default('*'),

  // Anomaly detection interval in ms (default 60s, can be disabled with 0)
  ANOMALY_INTERVAL_MS: z.coerce.number().int().nonnegative().default(60000),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  parsed.error.issues.forEach((issue) => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
