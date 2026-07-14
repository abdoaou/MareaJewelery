import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { prisma } from '../../config/prisma.js'

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError()

    const payload = verifyAccessToken(header.slice(7))
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user || user.status === 'DELETED' || user.status === 'BLOCKED') {
      throw new UnauthorizedError('Account unavailable')
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'))
    }
    next(err)
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()

  // Invalid/expired tokens must not block public routes (catalog, etc.)
  authenticate(req, _res, (err) => {
    if (err) {
      req.user = undefined
      return next()
    }
    next()
  })
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError())
    if (!roles.includes(req.user.role)) return next(new ForbiddenError())
    next()
  }
}

export const adminOnly = authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')
export const superAdminOnly = authorize('SUPER_ADMIN')
