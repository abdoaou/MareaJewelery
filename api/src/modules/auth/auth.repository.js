import crypto from 'crypto'
import prisma from '../../config/prisma.js'

function sixDigitCode() {
  return String(crypto.randomInt(100000, 1000000))
}

async function createWithUniqueToken(create) {
  let lastError
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await create(sixDigitCode())
    } catch (err) {
      lastError = err
      // Prisma unique constraint — try another code
      if (err?.code === 'P2002') continue
      throw err
    }
  }
  throw lastError
}

export const authRepository = {
  findByEmail: (email) =>
    prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } }),

  findById: (id) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        rewardPoints: true,
        walletBalance: true,
        createdAt: true,
      },
    }),

  findByIdWithPassword: (id) => prisma.user.findUnique({ where: { id } }),

  createUser: (data) => prisma.user.create({ data }),

  updateUser: (id, data) => prisma.user.update({ where: { id }, data }),

  createSession: (data) => prisma.session.create({ data }),

  findSession: (refreshToken) =>
    prisma.session.findUnique({ where: { refreshToken }, include: { user: true } }),

  revokeSession: (refreshToken) =>
    prisma.session.update({
      where: { refreshToken },
      data: { revokedAt: new Date() },
    }),

  revokeAllSessions: (userId) =>
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

  createPasswordReset: async (email) => {
    const normalized = String(email).trim().toLowerCase()
    await prisma.passwordReset.updateMany({
      where: { email: normalized, usedAt: null },
      data: { usedAt: new Date() },
    })
    return createWithUniqueToken((token) =>
      prisma.passwordReset.create({
        data: {
          email: normalized,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    )
  },

  findPasswordReset: (token) =>
    prisma.passwordReset.findUnique({ where: { token } }),

  findPasswordResetByEmailAndCode: (email, code) =>
    prisma.passwordReset.findFirst({
      where: {
        email: String(email).trim().toLowerCase(),
        token: code,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    }),

  markPasswordResetUsed: (id) =>
    prisma.passwordReset.update({ where: { id }, data: { usedAt: new Date() } }),

  createEmailVerification: async (userId) => {
    await prisma.emailVerification.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
    return createWithUniqueToken((token) =>
      prisma.emailVerification.create({
        data: {
          userId,
          token,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      }),
    )
  },

  findEmailVerification: (token) =>
    prisma.emailVerification.findUnique({ where: { token } }),

  findEmailVerificationByCode: async (email, code) => {
    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    })
    if (!user) return null
    return prisma.emailVerification.findFirst({
      where: { userId: user.id, token: code, usedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  },

  markVerificationUsed: (id) =>
    prisma.emailVerification.update({ where: { id }, data: { usedAt: new Date() } }),

  markEmailVerified: (userId) =>
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date(), status: 'ACTIVE' },
    }),

  logAdminAction: (data) => prisma.adminLog.create({ data }),
}
