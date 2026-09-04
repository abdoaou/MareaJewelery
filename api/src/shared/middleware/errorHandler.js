import { logger } from '../utils/logger.js'
import { AppError } from '../errors/AppError.js'
import { env } from '../../config/env.js'

function isDatabaseCapacityError(err) {
  const message = String(err?.message || '')
  return (
    err?.name?.startsWith?.('PrismaClient') ||
    message.includes('max clients') ||
    message.includes('connection pool') ||
    message.includes('Too many connections')
  )
}

export function errorHandler(err, req, res, _next) {
  if (isDatabaseCapacityError(err)) {
    logger.error('Database capacity error', {
      message: err.message,
      path: req.path,
      method: req.method,
    })
    return res.status(503).json({
      success: false,
      message: 'Service is busy. Please try again in a moment.',
      code: 'SERVICE_UNAVAILABLE',
    })
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details && { details: err.details }),
    })
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  return res.status(500).json({
    success: false,
    message: env.nodeEnv === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  })
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  })
}
