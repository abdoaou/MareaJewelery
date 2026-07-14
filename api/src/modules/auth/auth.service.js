import bcrypt from 'bcryptjs'
import { authRepository } from './auth.repository.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.js'
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from '../../shared/errors/AppError.js'
import { env } from '../../config/env.js'
import { sendEmail } from '../../shared/services/email.service.js'
import { wrapVerificationEmail, wrapPasswordResetEmail } from '../../shared/services/email.templates.js'
import { logger } from '../../shared/utils/logger.js'
import { cartService } from '../cart/cart.service.js'

const SALT_ROUNDS = 12

async function sendVerificationEmail(user, code) {
  const name = user.firstName || 'Customer'
  await sendEmail({
    to: user.email,
    subject: 'Verify your Marea account',
    html: wrapVerificationEmail({ firstName: name, code }),
    text: `Hello ${name},\n\nYour Marea verification code is: ${code}\n\nThis code expires in 15 minutes.`,
  })
}

async function sendPasswordResetEmail(user, code) {
  await sendEmail({
    to: user.email,
    subject: 'Reset your Marea password',
    html: wrapPasswordResetEmail({ code }),
    text: `Your Marea password reset code is: ${code}\n\nThis code expires in 1 hour.`,
  })
}

function parseExpiry(exp) {
  const match = /^(\d+)([smhd])$/.exec(exp)
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const n = Number(match[1])
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]]
  return n * unit
}

function tokenPair(user) {
  const payload = { sub: user.id, email: user.email, role: user.role }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: user.id, type: 'refresh' }),
  }
}

export const authService = {
  async register({ email, password, firstName, lastName, phone, role }, meta = {}) {
    const existing = await authRepository.findByEmail(email)
    if (existing) throw new ConflictError('Email already registered')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await authRepository.createUser({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone,
      role: role || 'CUSTOMER',
      referralCode: `MAREA-${Date.now().toString(36).toUpperCase()}`,
    })

    const verification = await authRepository.createEmailVerification(user.id)
    let emailSent = true
    try {
      await sendVerificationEmail(user, verification.token)
    } catch (err) {
      emailSent = false
      logger.error('Verification email failed on register', {
        email: user.email,
        error: err.message,
      })
    }

    return { requiresVerification: true, email: user.email, emailSent }
  },

  async verifyEmailCode({ email, code }, meta = {}) {
    const record = await authRepository.findEmailVerificationByCode(email, code)
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired verification code')
    }

    const user = await authRepository.findByIdWithPassword(record.userId)
    if (!user) throw new NotFoundError('User')
    if (user.emailVerified) throw new ValidationError('Email already verified')

    await authRepository.markEmailVerified(record.userId)
    await authRepository.markVerificationUsed(record.id)

    const tokens = tokenPair(user)
    await authRepository.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn)),
    })

    const profile = await authRepository.findById(user.id)

    if (meta.sessionId) {
      await cartService.mergeGuestCart(meta.sessionId, user.id).catch((err) => {
        logger.warn('Guest cart merge failed', { error: err.message })
      })
    }

    return { user: sanitizeUser(profile), ...tokens }
  },

  async resendVerification(email) {
    const user = await authRepository.findByEmail(email)
    if (!user) return { message: 'If the email exists, a verification code was sent' }
    if (user.emailVerified) throw new ValidationError('Email already verified')

    const verification = await authRepository.createEmailVerification(user.id)
    await sendVerificationEmail(user, verification.token)
    return { message: 'Verification code sent' }
  },

  async login({ email, password }, meta = {}) {
    const user = await authRepository.findByEmail(email)
    if (!user) throw new UnauthorizedError('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedError('Invalid credentials')

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Account suspended')
    }

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'].includes(user.role)
    if (!isAdmin && (!user.emailVerified || user.status === 'PENDING_VERIFICATION')) {
      throw new UnauthorizedError('Please verify your email before signing in')
    }

    await authRepository.updateUser(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: meta.ip,
    })

    const tokens = tokenPair(user)
    await authRepository.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn)),
    })

    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'].includes(user.role)) {
      await authRepository.logAdminAction({
        userId: user.id,
        action: 'LOGIN',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      })
    }

    if (meta.sessionId) {
      await cartService.mergeGuestCart(meta.sessionId, user.id).catch((err) => {
        logger.warn('Guest cart merge failed', { error: err.message })
      })
    }

    return { user: sanitizeUser(user), ...tokens }
  },

  async refresh(refreshToken) {
    verifyRefreshToken(refreshToken)
    const session = await authRepository.findSession(refreshToken)
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token')
    }

    await authRepository.revokeSession(refreshToken)
    const tokens = tokenPair(session.user)
    await authRepository.createSession({
      userId: session.userId,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + parseExpiry(env.jwt.refreshExpiresIn)),
    })

    return tokens
  },

  async logout(refreshToken, userId) {
    if (refreshToken) await authRepository.revokeSession(refreshToken).catch(() => {})
    if (userId) {
      await authRepository.logAdminAction({
        userId,
        action: 'LOGOUT',
      }).catch(() => {})
    }
  },

  async forgotPassword(email) {
    const normalized = String(email || '').trim().toLowerCase()
    const user = await authRepository.findByEmail(normalized)
    if (!user) return { message: 'If the email exists, a reset code was sent' }

    const reset = await authRepository.createPasswordReset(normalized)
    try {
      await sendPasswordResetEmail(user, reset.token)
    } catch (err) {
      logger.error('Password reset email failed', { email: user.email, error: err.message })
      throw new ValidationError('Could not send reset code. Please try again.')
    }
    return { message: 'If the email exists, a reset code was sent' }
  },

  async resetPassword(token, password, email) {
    const reset = email
      ? await authRepository.findPasswordResetByEmailAndCode(email, token)
      : await authRepository.findPasswordReset(token)
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired reset code')
    }

    const user = await authRepository.findByEmail(reset.email)
    if (!user) throw new NotFoundError('User')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    await authRepository.updateUser(user.id, { passwordHash })
    await authRepository.markPasswordResetUsed(reset.id)
    await authRepository.revokeAllSessions(user.id)
  },

  async verifyEmail(token) {
    const record = await authRepository.findEmailVerification(token)
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired verification token')
    }
    await authRepository.markEmailVerified(record.userId)
    await authRepository.markVerificationUsed(record.id)
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findByIdWithPassword(userId)
    if (!user) throw new NotFoundError('User')
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedError('Current password is incorrect')

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await authRepository.updateUser(userId, { passwordHash })
    await authRepository.revokeAllSessions(userId)
  },

  async updateProfile(userId, data) {
    return authRepository.updateUser(userId, data)
  },

  async getProfile(userId) {
    const user = await authRepository.findById(userId)
    if (!user) throw new NotFoundError('User')
    return user
  },

  async deleteAccount(userId) {
    await authRepository.updateUser(userId, { status: 'DELETED', deletedAt: new Date() })
    await authRepository.revokeAllSessions(userId)
  },
}

function sanitizeUser(user) {
  const { passwordHash, twoFactorSecret, ...safe } = user
  return safe
}
