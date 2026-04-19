/**
 * Centralized Express error handler.
 * Route files use `next(err)` to bubble errors here instead of handling them inline.
 *
 * This middleware MUST be registered LAST, after all routes, in src/index.js.
 */

import { isProduction } from '../config/env.js'

/**
 * Custom error class — use `throw new ApiError(400, 'Invalid input')` in routes.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Wraps async route handlers so thrown errors automatically bubble to this middleware.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * Not-found handler — mount AFTER routes but BEFORE the error handler.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.originalUrl,
  })
}

/**
 * Main error handler — must accept 4 args (err, req, res, next) for Express to recognize it.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500
  const isServerError = statusCode >= 500

  // Always log the error server-side
  if (isServerError) {
    console.error(`❌ ${req.method} ${req.path} — ${err.message}`)
    if (err.stack && !isProduction) console.error(err.stack)
  } else {
    console.warn(`⚠️  ${req.method} ${req.path} — ${statusCode}: ${err.message}`)
  }

  // In production, hide 500 error details from the client
  const clientMessage = isServerError && isProduction
    ? 'Internal server error'
    : err.message

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    ...(err.details && { details: err.details }),
    ...(!isProduction && isServerError && { stack: err.stack }),
  })
}
