import { isProduction } from '../config/env.js'
import logger from '../lib/logger.js'

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export function notFoundHandler(req, res) {
  logger.warn({ method: req.method, path: req.originalUrl }, '404 not found')
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.originalUrl,
  })
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500
  const isServerError = statusCode >= 500

  const logContext = {
    method: req.method,
    path: req.path,
    statusCode,
    err: {
      name: err.name,
      message: err.message,
      ...(err.details && { details: err.details }),
      ...(isServerError && { stack: err.stack }),
    },
  }

  if (isServerError) {
    console.error('FULL ERROR:', err)
    logger.error(logContext, 'Server error handling request')
  } else {
    logger.warn(logContext, 'Client error handling request')
  }

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
