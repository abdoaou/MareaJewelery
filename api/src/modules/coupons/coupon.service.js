import prisma from '../../config/prisma.js'
import { ValidationError } from '../../shared/errors/AppError.js'

const COUPON_TTL_DAYS = 30

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export const couponService = {
  couponTtlDays: COUPON_TTL_DAYS,

  normalizeCode,

  async validateForCheckout(userId, code, subtotal, shipping = 0) {
    const normalized = normalizeCode(code)
    if (!normalized) throw new ValidationError('Coupon code is required')

    const coupon = await prisma.coupon.findUnique({ where: { code: normalized } })
    if (!coupon || !coupon.isActive) throw new ValidationError('Invalid coupon code')

    const now = new Date()
    if (coupon.startsAt && coupon.startsAt > now) throw new ValidationError('Coupon is not active yet')
    if (coupon.expiresAt && coupon.expiresAt < now) throw new ValidationError('Coupon has expired')
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new ValidationError('Coupon has already been used')
    }

    if (coupon.minOrderValue != null && subtotal < Number(coupon.minOrderValue)) {
      throw new ValidationError(`Minimum order value is ${coupon.minOrderValue}`)
    }

    const wheelSpin = await prisma.wheelSpin.findFirst({ where: { couponId: coupon.id } })
    if (wheelSpin?.userId && userId && wheelSpin.userId !== userId) {
      throw new ValidationError('This coupon belongs to another account')
    }
    if (wheelSpin?.userId && !userId) {
      throw new ValidationError('Log in to use this coupon')
    }

    let discount = 0
    let freeShipping = false
    let adjustedShipping = shipping

    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.round(subtotal * (Number(coupon.discountValue) / 100) * 100) / 100
    } else if (coupon.discountType === 'FIXED') {
      discount = Math.min(Number(coupon.discountValue), subtotal)
    } else if (coupon.discountType === 'FREE_SHIPPING') {
      freeShipping = true
      adjustedShipping = 0
      discount = shipping
    }

    return {
      coupon,
      wheelSpin,
      discount,
      freeShipping,
      shipping: adjustedShipping,
    }
  },

  async redeemOnOrder(tx, couponId, wheelSpinId) {
    const coupon = await tx.coupon.findUnique({ where: { id: couponId } })
    if (!coupon) throw new ValidationError('Coupon not found')
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new ValidationError('Coupon has already been used')
    }

    const updated = await tx.coupon.updateMany({
      where: {
        id: couponId,
        ...(coupon.maxUses != null ? { usedCount: { lt: coupon.maxUses } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    })

    if (updated.count === 0) throw new ValidationError('Coupon has already been used')

    if (wheelSpinId) {
      await tx.wheelSpin.update({
        where: { id: wheelSpinId },
        data: { usedAt: new Date() },
      })
    }
  },
}
