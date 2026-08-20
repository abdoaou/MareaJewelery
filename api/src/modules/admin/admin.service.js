import prisma from '../../config/prisma.js'
import { AppError, ValidationError } from '../../shared/errors/AppError.js'
import { notifyAdmin } from '../../sockets/index.js'
import { sendEmail, sendBulkEmails, assertEmailConfigured as checkEmailConfigured } from '../../shared/services/email.service.js'
import { personalize, plainTextToHtml, wrapBroadcastEmail } from '../../shared/services/email.templates.js'
import { logger } from '../../shared/utils/logger.js'
import { cacheGet, cacheSet, cacheDel } from '../../config/redis.js'

const PLACEHOLDER_EMAIL_RE = /@(example\.com|example\.org|test\.com|localhost)$/i

function isDeliverableEmail(email) {
  if (!email || !email.includes('@')) return false
  if (PLACEHOLDER_EMAIL_RE.test(email)) return false
  return true
}

function assertEmailConfigured() {
  try {
    checkEmailConfigured()
  } catch (err) {
    throw new AppError(err.message, 503, 'EMAIL_NOT_CONFIGURED')
  }
}

function dayStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysAgo(n) {
  return new Date(dayStart().getTime() - n * 86400000)
}

async function revenueBetween(from, to = null) {
  const where = { createdAt: { gte: from } }
  if (to) where.createdAt.lt = to
  return prisma.order.aggregate({ where, _sum: { total: true }, _count: true })
}

export const adminService = {
  async dashboardStats() {
    const today = dayStart()
    const yesterday = daysAgo(1)
    const last7 = daysAgo(7)
    const last30 = daysAgo(30)

    const cached = await cacheGet('admin:dashboard:stats')
    if (cached) return cached

    // Few round-trips: remote Supabase latency dominates when we fan out many queries
    const [orderRollup, catalogRollup] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(total), 0)::float AS total_revenue,
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(CASE WHEN created_at >= ${today} THEN total ELSE 0 END), 0)::float AS today_revenue,
          COUNT(*) FILTER (WHERE created_at >= ${today})::int AS today_orders,
          COALESCE(SUM(CASE WHEN created_at >= ${yesterday} AND created_at < ${today} THEN total ELSE 0 END), 0)::float AS yesterday_revenue,
          COUNT(*) FILTER (WHERE created_at >= ${yesterday} AND created_at < ${today})::int AS yesterday_orders,
          COALESCE(SUM(CASE WHEN created_at >= ${last7} THEN total ELSE 0 END), 0)::float AS last7_revenue,
          COALESCE(SUM(CASE WHEN created_at >= ${last30} THEN total ELSE 0 END), 0)::float AS last30_revenue,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_orders,
          COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'))::int AS processing_orders,
          COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_orders,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_orders
        FROM orders
      `,
      prisma.$queryRaw`
        SELECT
          (SELECT COUNT(*)::int FROM products WHERE deleted_at IS NULL) AS total_products,
          (SELECT COUNT(*)::int FROM products WHERE deleted_at IS NULL AND status = 'PUBLISHED') AS active_products,
          (SELECT COUNT(*)::int FROM inventory WHERE current_stock = 0) AS out_of_stock,
          (SELECT COUNT(*)::int FROM inventory WHERE current_stock > 0 AND current_stock <= 5) AS low_stock,
          (SELECT COUNT(*)::int FROM categories WHERE deleted_at IS NULL) AS total_categories,
          (SELECT COUNT(*)::int FROM users WHERE role = 'CUSTOMER' AND status = 'ACTIVE') AS total_customers,
          (SELECT COUNT(*)::int FROM users WHERE role = 'CUSTOMER' AND created_at >= ${today}) AS new_customers_today,
          (SELECT COALESCE(SUM(like_count), 0)::int FROM products WHERE deleted_at IS NULL) AS total_likes,
          (SELECT COALESCE(SUM(view_count), 0)::int FROM products WHERE deleted_at IS NULL) AS total_views
      `,
    ])

    const o = orderRollup[0] || {}
    const c = catalogRollup[0] || {}
    const totalOrders = Number(o.total_orders || 0)
    const totalRevenue = Number(o.total_revenue || 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const totalViews = Number(c.total_views || 0)
    const totalProducts = Number(c.total_products || 0)
    const activeProducts = Number(c.active_products || 0)

    const stats = {
      revenue: {
        total: totalRevenue,
        today: Number(o.today_revenue || 0),
        yesterday: Number(o.yesterday_revenue || 0),
        last3Days: Number(o.last7_revenue || 0),
        last7Days: Number(o.last7_revenue || 0),
        last10Days: Number(o.last7_revenue || 0),
        last30Days: Number(o.last30_revenue || 0),
      },
      orders: {
        total: totalOrders,
        today: Number(o.today_orders || 0),
        yesterday: Number(o.yesterday_orders || 0),
        pending: Number(o.pending_orders || 0),
        processing: Number(o.processing_orders || 0),
        delivered: Number(o.delivered_orders || 0),
        cancelled: Number(o.cancelled_orders || 0),
        returned: 0,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        hidden: Math.max(0, totalProducts - activeProducts),
        outOfStock: Number(c.out_of_stock || 0),
        lowStock: Number(c.low_stock || 0),
      },
      categories: { total: Number(c.total_categories || 0) },
      customers: {
        total: Number(c.total_customers || 0),
        newToday: Number(c.new_customers_today || 0),
      },
      engagement: {
        totalLikes: Number(c.total_likes || 0),
        totalReviews: 0,
        totalQuestions: 0,
        totalViews,
        averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      },
      visitors: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
      inventory: { value: 0 },
    }

    await cacheSet('admin:dashboard:stats', stats, 30)
    return stats
  },

  async chartData() {
    const cached = await cacheGet('admin:dashboard:charts')
    if (cached) return cached

    const since = daysAgo(30)

    const [dailySales, orderStatus, topProducts, topCategories, mostViewed] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE(created_at) AS date,
               SUM(total)::float AS revenue,
               COUNT(*)::int AS orders
        FROM orders
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.$queryRaw`
        SELECT oi.product_name AS name, SUM(oi.quantity)::int AS sales, SUM(oi.line_total)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${since}
        GROUP BY oi.product_name
        ORDER BY sales DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT c.name, COUNT(oi.id)::int AS sales, SUM(oi.line_total)::float AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN categories c ON c.id = p.category_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${since}
        GROUP BY c.name
        ORDER BY revenue DESC NULLS LAST
        LIMIT 8
      `,
      prisma.product.findMany({
        where: { deletedAt: null },
        select: { name: true, viewCount: true, likeCount: true },
        orderBy: { viewCount: 'desc' },
        take: 8,
      }),
    ])

    const data = {
      dailySales,
      orderStatus: orderStatus.map((s) => ({ status: s.status, count: s._count })),
      topProducts,
      leastProducts: [],
      mostViewed,
      mostLiked: [],
      topCategories,
      topCustomers: [],
      lowStockProducts: [],
      outOfStockProducts: [],
    }

    await cacheSet('admin:dashboard:charts', data, 60)
    return data
  },

  getNotifications: (limit = 50) =>
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),

  markNotificationRead: (id) =>
    prisma.notification.update({ where: { id }, data: { isRead: true } }),

  markAllNotificationsRead: () =>
    prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } }),

  getAuditLogs: (limit = 50) =>
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),

  getAdminLogs: (limit = 50) =>
    prisma.adminLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { email: true } } },
    }),

  async listInventory({ page = 1, limit = 20, search, lowStock }) {
    const where = {}
    if (lowStock === 'true') where.currentStock = { lte: 5 }
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 20

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, costPrice: true } },
          warehouse: { select: { name: true, code: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { currentStock: 'asc' },
      }),
      prisma.inventory.count({ where }),
    ])

    return { items, total, page: pageNum, limit: limitNum }
  },

  async adjustStock({ inventoryId, quantity, reason, note, userId, ipAddress }) {
    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } })
    if (!inv) throw new ValidationError('Inventory record not found')

    const oldQty = inv.currentStock
    const newQty = oldQty + quantity
    if (newQty < 0) throw new ValidationError('Stock cannot be negative')

    const updated = await prisma.inventory.update({
      where: { id: inventoryId },
      data: { currentStock: newQty },
      include: { product: true, warehouse: true },
    })

    await prisma.stockMovement.create({
      data: {
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        userId,
        oldQty,
        newQty,
        difference: quantity,
        reason: reason || 'MANUAL_UPDATE',
        note,
        ipAddress,
      },
    })

    if (newQty === 0) {
      await prisma.notification.create({
        data: {
          type: 'OUT_OF_STOCK',
          title: 'Out of Stock',
          message: `${updated.product.name} is out of stock`,
          data: { productId: inv.productId },
        },
      })
      notifyAdmin('out_of_stock', { productId: inv.productId, name: updated.product.name })
    } else if (newQty <= inv.lowStockThreshold) {
      await prisma.notification.create({
        data: {
          type: 'LOW_STOCK',
          title: 'Low Stock',
          message: `${updated.product.name} has only ${newQty} units left`,
          data: { productId: inv.productId },
        },
      })
      notifyAdmin('low_stock', { productId: inv.productId, name: updated.product.name, stock: newQty })
    }

    return updated
  },

  getStockMovements: (limit = 50) =>
    prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { email: true, firstName: true } },
      },
    }),

  async listCustomers({ page = 1, limit = 20, search }) {
    const where = { role: 'CUSTOMER' }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 20

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          rewardPoints: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return { items, total, page: pageNum, limit: limitNum }
  },

  async broadcastCustomerEmail({ subject, message, adminId, adminEmail }) {
    assertEmailConfigured()
    const trimmedSubject = subject?.trim()
    const trimmedMessage = message?.trim()
    if (!trimmedSubject) throw new ValidationError('Subject is required')
    if (!trimmedMessage) throw new ValidationError('Message is required')
    if (trimmedSubject.length > 200) throw new ValidationError('Subject is too long')
    if (trimmedMessage.length > 10000) throw new ValidationError('Message is too long')

    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        status: { notIn: ['DELETED', 'BLOCKED'] },
        email: { not: '' },
      },
      select: { id: true, email: true, firstName: true, lastName: true, emailVerified: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!customers.length) throw new ValidationError('No customers found to email')

    const deliverable = customers.filter((c) => isDeliverableEmail(c.email))
    const skipped = customers.length - deliverable.length

    if (!deliverable.length) {
      throw new ValidationError(
        `No deliverable customer emails found (${skipped} skipped as invalid or test addresses).`,
      )
    }

    const messages = deliverable.map((customer) => {
      const bodyText = personalize(trimmedMessage, customer.firstName)
      const bodyHtml = plainTextToHtml(bodyText)
      const html = wrapBroadcastEmail({ firstName: customer.firstName, bodyHtml })
      return {
        to: customer.email,
        subject: trimmedSubject,
        html,
        text: bodyText,
      }
    })

    const { sent, failures } = await sendBulkEmails(messages)

    await prisma.adminLog
      .create({
        data: {
          userId: adminId,
          action: 'CUSTOMER_EMAIL_BROADCAST',
          resource: 'customers',
          details: {
            subject: trimmedSubject,
            sent,
            skipped,
            failed: failures.length,
            failures: failures.slice(0, 20),
          },
        },
      })
      .catch(() => {})

    if (sent === 0) {
      const detail = failures[0]?.error || 'Unknown error'
      throw new ValidationError(`Could not send any emails. ${detail}`)
    }

    // Send the admin a copy so they can confirm delivery (and check spam)
    if (adminEmail && isDeliverableEmail(adminEmail)) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `[Marea Admin] Broadcast sent to ${sent} customer(s): ${trimmedSubject}`,
          html: wrapBroadcastEmail({
            firstName: 'Admin',
            bodyHtml: `<p>Your customer broadcast was delivered to <strong>${sent}</strong> recipient(s).</p><p><strong>Subject:</strong> ${trimmedSubject}</p><p>Skipped: ${skipped} · Failed: ${failures.length}</p><p>If customers did not receive it, ask them to check spam.</p>`,
          }),
          text: `Broadcast delivered to ${sent} customers.\nSubject: ${trimmedSubject}\nSkipped: ${skipped}\nFailed: ${failures.length}`,
        })
      } catch (err) {
        logger.warn('[Broadcast admin copy failed]', { adminEmail, error: err.message })
      }
    }

    return {
      sent,
      skipped,
      failed: failures.length,
      total: customers.length,
      failures: failures.slice(0, 10),
    }
  },

  async sendTestCustomerEmail({ subject, message, adminId, adminEmail, adminFirstName }) {
    assertEmailConfigured()
    const trimmedSubject = subject?.trim() || 'Marea test email'
    const trimmedMessage = message?.trim() || 'This is a test email from the Marea admin panel.'
    if (!adminEmail) throw new ValidationError('Admin email is missing')

    const bodyText = personalize(trimmedMessage, adminFirstName || 'Admin')
    const bodyHtml = plainTextToHtml(bodyText)
    const html = wrapBroadcastEmail({ firstName: adminFirstName || 'Admin', bodyHtml })

    try {
      await sendEmail({
        to: adminEmail,
        subject: `[TEST] ${trimmedSubject}`,
        html,
        text: bodyText,
      })
    } catch (err) {
      logger.error('[Test email failed]', { to: adminEmail, error: err.message })
      throw new AppError(
        `Could not send test email: ${err.message}`,
        502,
        'EMAIL_SEND_FAILED',
      )
    }

    await prisma.adminLog
      .create({
        data: {
          userId: adminId,
          action: 'CUSTOMER_EMAIL_TEST',
          resource: 'customers',
          details: { subject: trimmedSubject, to: adminEmail },
        },
      })
      .catch(() => {})

    return { sent: 1, to: adminEmail }
  },

  async resetAnalytics() {
    await prisma.$transaction([
      prisma.reviewImage.deleteMany({}),
      prisma.review.deleteMany({}),
      prisma.productQuestion.deleteMany({}),
      prisma.order.deleteMany({}),
      prisma.notification.deleteMany({}),
      prisma.recentlyViewed.deleteMany({}),
      prisma.stockMovement.deleteMany({}),
      prisma.wishlist.deleteMany({}),
      prisma.product.updateMany({
        where: { deletedAt: null },
        data: { viewCount: 0, likeCount: 0 },
      }),
    ])

    await cacheDel('admin:dashboard:*')
    await cacheDel('products:*')

    return {
      ordersDeleted: true,
      engagementReset: true,
      notificationsCleared: true,
    }
  },
}
