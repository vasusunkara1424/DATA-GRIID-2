/**
 * Structured logger using Pino.
 *
 * Environment-aware output:
 *   - Development: pretty-printed, color-coded, human-readable
 *   - Production:  JSON lines, ready for log aggregators (Datadog, Loki, CloudWatch)
 *
 * Log levels (in order of severity):
 *   trace < debug < info < warn < error < fatal
 *
 * Set LOG_LEVEL env var to control verbosity (default: info in prod, debug in dev)
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Pretty transport for dev, JSON for prod
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Redact sensitive fields automatically
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.api_key',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },

  // Add consistent fields to every log line
  base: {
    service: 'datagriid-api',
    env: process.env.NODE_ENV || 'development',
  },

  // Use millisecond timestamps
  timestamp: pino.stdTimeFunctions.isoTime,
})

export default logger
