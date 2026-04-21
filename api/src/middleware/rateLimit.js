/**
 * Rate limiting middleware.
 * Two tiers:
 *   - generalLimiter: protects all routes from abuse (100 req / 15min per IP)
 *   - aiLimiter: strict limit on AI routes to protect OpenAI spend (10 req / 1min per IP)
 */

import rateLimit from 'express-rate-limit'

// General API limiter — applied globally to all /api/* routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: 'draft-7', // modern RateLimit-* headers
  legacyHeaders: false,       // disable X-RateLimit-* (older spec)
  message: {
    error: 'Too many requests',
    message: 'Please slow down. Try again in a few minutes.',
    retryAfter: '15 minutes',
  },
  // Don't count health checks
  skip: (req) => req.path === '/health' || req.path === '/',
})

// AI endpoint limiter — stricter, protects OpenAI spend
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,              // 10 AI calls per minute per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'AI rate limit exceeded',
    message: 'Too many AI requests. AI calls are expensive — please wait 60 seconds.',
    retryAfter: '60 seconds',
  },
})

// Auth/login limiter — strict, prevents credential stuffing
// (Reserved for future auth routes, not wired in yet)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failures
  message: {
    error: 'Too many authentication attempts',
    message: 'Account temporarily locked. Try again in 15 minutes.',
  },
})
