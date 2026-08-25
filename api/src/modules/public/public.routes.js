import prisma from '../../config/prisma.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { analyticsService } from '../analytics/analytics.service.js'
import { Router } from 'express'

const router = Router()

router.post(
  '/visit',
  asyncHandler(async (req, res) => {
    const sessionId = req.headers['x-session-id']
    const path = req.body?.path || req.headers.referer || '/'
    const userAgent = req.headers['user-agent'] || ''

    const result = await analyticsService.recordVisit({
      sessionId: typeof sessionId === 'string' ? sessionId : '',
      path,
      userAgent,
    })

    return success(res, { data: result })
  }),
)

router.get(
  '/recent-orders',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED', 'DELIVERED'] } },
      include: { items: { take: 1 }, user: { select: { firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const data = orders.map((o) => ({
      productName: o.items[0]?.productName || 'Jewelry',
      city: o.shippingAddress?.city || 'your area',
      customerInitial: (o.user?.firstName || 'S').charAt(0),
      minutesAgo: Math.max(1, Math.round((Date.now() - o.createdAt.getTime()) / 60000)),
    }))

    return success(res, { data })
  }),
)

router.get(
  '/live-sale-settings',
  asyncHandler(async (_req, res) => {
    let settings = await prisma.liveSalePopup.findFirst()
    if (!settings) settings = await prisma.liveSalePopup.create({ data: {} })
    return success(res, { data: settings })
  }),
)

export default router
