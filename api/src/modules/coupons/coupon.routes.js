import { Router } from 'express'
import { couponService } from './coupon.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { authenticate } from '../../shared/middleware/auth.js'

const router = Router()

router.post(
  '/validate',
  authenticate,
  asyncHandler(async (req, res) => {
    const { code, subtotal, shipping } = req.body
    const result = await couponService.validateForCheckout(
      req.user.id,
      code,
      Number(subtotal || 0),
      Number(shipping || 0),
    )
    return success(res, {
      data: {
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: Number(result.coupon.discountValue),
        discount: result.discount,
        freeShipping: result.freeShipping,
        shipping: result.shipping,
        expiresAt: result.coupon.expiresAt,
      },
    })
  }),
)

export default router
