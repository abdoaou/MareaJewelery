import { randomBytes } from 'crypto'
import prisma from '../../config/prisma.js'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/AppError.js'
import { couponService } from '../coupons/coupon.service.js'

const CAMPAIGN_KEY = 'default'
const COUPON_TTL_DAYS = couponService.couponTtlDays

function isPrizeAvailable(prize, now = new Date()) {
  if (!prize.active) return false
  if (prize.expiresAt && prize.expiresAt < now) return false
  if (prize.stock != null && prize.stock <= 0) return false
  if (Number(prize.probability) <= 0) return false
  return true
}

function pickWeightedPrize(prizes) {
  const available = prizes.filter((p) => isPrizeAvailable(p))
  if (!available.length) throw new ValidationError('No active prizes available')

  const total = available.reduce((sum, p) => sum + Number(p.probability), 0)
  if (total <= 0) throw new ValidationError('No active prizes available')

  let roll = Math.random() * total
  for (const prize of available) {
    roll -= Number(prize.probability)
    if (roll <= 0) return prize
  }
  return available[available.length - 1]
}

function generateCouponCode(prize) {
  const valuePart =
    prize.type === 'DISCOUNT' && prize.value != null
      ? String(Math.round(Number(prize.value)))
      : prize.type === 'FREE_SHIPPING'
        ? 'SHIP'
        : prize.type === 'FREE_GIFT'
          ? 'GIFT'
          : 'LUCKY'
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 5)
  return `LUCKY${valuePart}-${suffix}`
}

function couponPayloadForPrize(prize) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + COUPON_TTL_DAYS)

  if (prize.type === 'DISCOUNT') {
    return {
      discountType: 'PERCENTAGE',
      discountValue: Number(prize.value),
      description: `Lucky Wheel: ${prize.name}`,
      expiresAt,
    }
  }
  if (prize.type === 'FREE_SHIPPING') {
    return {
      discountType: 'FREE_SHIPPING',
      discountValue: 0,
      description: `Lucky Wheel: ${prize.name}`,
      expiresAt,
    }
  }
  if (prize.type === 'FREE_GIFT') {
    return {
      discountType: 'FIXED',
      discountValue: 0,
      description: `Lucky Wheel: ${prize.name} (contact support to claim)`,
      expiresAt,
    }
  }
  return null
}

function publicPrize(prize) {
  return {
    id: prize.id,
    name: prize.name,
    type: prize.type.toLowerCase(),
    value: prize.value != null ? Number(prize.value) : null,
    sortOrder: prize.sortOrder,
  }
}

function publicSpinResult(spin, prizes, options = {}) {
  const segmentIndex = prizes.findIndex((p) => p.id === spin.prizeId)
  const prize = spin.prize || prizes.find((p) => p.id === spin.prizeId)

  return {
    spinId: spin.id,
    segmentIndex: segmentIndex >= 0 ? segmentIndex : 0,
    prize: prize
      ? {
          id: prize.id,
          name: prize.name,
          type: prize.type.toLowerCase(),
          value: prize.value != null ? Number(prize.value) : null,
        }
      : null,
    couponCode: spin.couponCode,
    isWinner: prize?.type !== 'NO_PRIZE',
    claimed: Boolean(spin.claimedAt || spin.userId),
    requiresLogin: !spin.userId && prize?.type !== 'NO_PRIZE',
    alreadyUsed: options.alreadyUsed || false,
  }
}

async function findExistingSpin({ userId, sessionId, campaignKey = CAMPAIGN_KEY }) {
  if (userId) {
    return prisma.wheelSpin.findFirst({
      where: { userId, campaignKey },
      include: { prize: true },
    })
  }
  if (sessionId) {
    return prisma.wheelSpin.findFirst({
      where: { sessionId, campaignKey },
      include: { prize: true },
    })
  }
  return null
}

async function getOrderedActivePrizes() {
  const prizes = await prisma.wheelPrize.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return prizes
}

export const wheelService = {
  CAMPAIGN_KEY,

  async listPublicPrizes() {
    const prizes = await getOrderedActivePrizes()
    return prizes.map(publicPrize)
  },

  async getStatus({ userId, sessionId }) {
    const prizes = await getOrderedActivePrizes()
    const hasActivePrizes = prizes.some((p) => isPrizeAvailable(p))

    const existing = await findExistingSpin({ userId, sessionId })
    if (existing) {
      return {
        canSpin: false,
        hasActivePrizes,
        alreadySpun: true,
        result: publicSpinResult(existing, prizes, { alreadyUsed: true }),
      }
    }

    return {
      canSpin: hasActivePrizes,
      hasActivePrizes,
      alreadySpun: false,
      result: null,
    }
  },

  async spin({ userId, sessionId }) {
    if (!userId && !sessionId) {
      throw new ValidationError('Session is required')
    }

    const prizes = await getOrderedActivePrizes()
    if (!prizes.some((p) => isPrizeAvailable(p))) {
      throw new ValidationError('Lucky Wheel is not available right now')
    }

    const existing = await findExistingSpin({ userId, sessionId })
    if (existing) {
      return publicSpinResult(existing, prizes, { alreadyUsed: true })
    }

    try {
      return await prisma.$transaction(async (tx) => {
        if (userId) {
          const userSpin = await tx.wheelSpin.findFirst({
            where: { userId, campaignKey: CAMPAIGN_KEY },
          })
          if (userSpin) {
            const full = await tx.wheelSpin.findUnique({
              where: { id: userSpin.id },
              include: { prize: true },
            })
            return publicSpinResult(full, prizes, { alreadyUsed: true })
          }
        }

        if (sessionId) {
          const sessionSpin = await tx.wheelSpin.findFirst({
            where: { sessionId, campaignKey: CAMPAIGN_KEY },
          })
          if (sessionSpin) {
            const full = await tx.wheelSpin.findUnique({
              where: { id: sessionSpin.id },
              include: { prize: true },
            })
            return publicSpinResult(full, prizes, { alreadyUsed: true })
          }
        }

        const freshPrizes = await tx.wheelPrize.findMany({
          where: { active: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })

        let selected = pickWeightedPrize(freshPrizes)

        if (selected.stock != null) {
          const stockUpdate = await tx.wheelPrize.updateMany({
            where: { id: selected.id, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          })
          if (stockUpdate.count === 0) {
            const fallback = freshPrizes.filter(
              (p) => p.id !== selected.id && isPrizeAvailable(p) && (p.stock == null || p.stock > 0),
            )
            if (!fallback.length) throw new ValidationError('Prize is out of stock')
            selected = pickWeightedPrize(fallback)
          }
        }

        let couponCode = null
        let couponId = null
        const couponData = couponPayloadForPrize(selected)

        if (couponData) {
          let code = generateCouponCode(selected)
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const exists = await tx.coupon.findUnique({ where: { code } })
            if (!exists) break
            code = generateCouponCode(selected)
          }

          const coupon = await tx.coupon.create({
            data: {
              code,
              description: couponData.description,
              discountType: couponData.discountType,
              discountValue: couponData.discountValue,
              maxUses: 1,
              usedCount: 0,
              expiresAt: couponData.expiresAt,
              isActive: true,
            },
          })
          couponCode = coupon.code
          couponId = coupon.id
        }

        const now = new Date()
        const spin = await tx.wheelSpin.create({
          data: {
            userId: userId || null,
            sessionId: userId ? null : sessionId,
            prizeId: selected.id,
            couponCode,
            couponId,
            campaignKey: CAMPAIGN_KEY,
            claimedAt: userId && selected.type !== 'NO_PRIZE' ? now : userId ? now : null,
          },
          include: { prize: true },
        })

        return publicSpinResult(spin, freshPrizes)
      })
    } catch (err) {
      if (err.code === 'P2002') {
        const existingAfterRace = await findExistingSpin({ userId, sessionId })
        if (existingAfterRace) {
          const prizesAfter = await getOrderedActivePrizes()
          return publicSpinResult(existingAfterRace, prizesAfter, { alreadyUsed: true })
        }
        throw new ConflictError('You have already used your Lucky Spin')
      }
      throw err
    }
  },

  async claim({ userId, sessionId, spinId }) {
    if (!userId) throw new ValidationError('Login required to claim prize')

    const userExisting = await prisma.wheelSpin.findFirst({
      where: { userId, campaignKey: CAMPAIGN_KEY },
      include: { prize: true },
    })
    if (userExisting) {
      const prizes = await getOrderedActivePrizes()
      return publicSpinResult(userExisting, prizes, { alreadyUsed: true })
    }

    let spin = null
    if (spinId) {
      spin = await prisma.wheelSpin.findUnique({
        where: { id: spinId },
        include: { prize: true },
      })
    }
    if (!spin && sessionId) {
      spin = await prisma.wheelSpin.findFirst({
        where: { sessionId, campaignKey: CAMPAIGN_KEY, userId: null },
        include: { prize: true },
      })
    }

    if (!spin) throw new NotFoundError('Spin')
    if (spin.userId && spin.userId !== userId) {
      throw new ConflictError('This spin belongs to another account')
    }
    if (spin.userId === userId) {
      const prizes = await getOrderedActivePrizes()
      return publicSpinResult(spin, prizes)
    }

    try {
      const updated = await prisma.wheelSpin.update({
        where: { id: spin.id },
        data: {
          userId,
          sessionId: null,
          claimedAt: spin.prize.type !== 'NO_PRIZE' ? new Date() : spin.claimedAt,
        },
        include: { prize: true },
      })
      const prizes = await getOrderedActivePrizes()
      return publicSpinResult(updated, prizes)
    } catch (err) {
      if (err.code === 'P2002') {
        throw new ConflictError('You have already used your Lucky Spin')
      }
      throw err
    }
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async adminStats() {
    const [totalSpins, winners, usedCoupons, prizes, spinsByPrize] = await Promise.all([
      prisma.wheelSpin.count(),
      prisma.wheelSpin.count({ where: { prize: { type: { not: 'NO_PRIZE' } } } }),
      prisma.wheelSpin.count({ where: { usedAt: { not: null } } }),
      prisma.wheelPrize.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      prisma.wheelSpin.groupBy({
        by: ['prizeId'],
        _count: { _all: true },
        orderBy: { _count: { prizeId: 'desc' } },
      }),
    ])

    const prizeMap = Object.fromEntries(prizes.map((p) => [p.id, p]))
    const mostWonGroup = spinsByPrize[0]
    const mostWonPrize = mostWonGroup ? prizeMap[mostWonGroup.prizeId] : null

    const couponsRemaining = await prisma.wheelSpin.count({
      where: {
        couponCode: { not: null },
        usedAt: null,
        prize: { type: { not: 'NO_PRIZE' } },
      },
    })

    return {
      totalSpins,
      totalWinners: winners,
      mostWonPrize: mostWonPrize
        ? { id: mostWonPrize.id, name: mostWonPrize.name, count: mostWonGroup._count._all }
        : null,
      couponsUsed: usedCoupons,
      couponsRemaining,
      prizeCount: prizes.length,
    }
  },

  async adminListPrizes() {
    return prisma.wheelPrize.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async adminCreatePrize(body) {
    return prisma.wheelPrize.create({
      data: {
        name: body.name,
        type: body.type,
        value: body.value ?? null,
        probability: body.probability,
        stock: body.stock ?? null,
        active: body.active ?? true,
        sortOrder: body.sortOrder ?? 0,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })
  },

  async adminUpdatePrize(id, body) {
    const prize = await prisma.wheelPrize.findUnique({ where: { id } })
    if (!prize) throw new NotFoundError('Prize')

    return prisma.wheelPrize.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.probability !== undefined && { probability: body.probability }),
        ...(body.stock !== undefined && { stock: body.stock }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.expiresAt !== undefined && {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        }),
      },
    })
  },

  async adminDeletePrize(id) {
    const prize = await prisma.wheelPrize.findUnique({ where: { id } })
    if (!prize) throw new NotFoundError('Prize')
    await prisma.wheelPrize.update({ where: { id }, data: { active: false } })
    return { id, deactivated: true }
  },

  async adminListSpins(query = {}) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const where = {}
    if (query.status === 'claimed') where.claimedAt = { not: null }
    if (query.status === 'unclaimed') {
      where.claimedAt = null
      where.prize = { type: { not: 'NO_PRIZE' } }
    }
    if (query.status === 'used') where.usedAt = { not: null }
    if (query.status === 'unused') {
      where.usedAt = null
      where.couponCode = { not: null }
    }

    const [items, total] = await Promise.all([
      prisma.wheelSpin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          prize: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.wheelSpin.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  },
}
