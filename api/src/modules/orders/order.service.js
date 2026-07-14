import prisma from '../../config/prisma.js'
import { ValidationError } from '../../shared/errors/AppError.js'
import { notifyAdmin, broadcastLiveSale } from '../../sockets/index.js'
import { emailQueue } from '../../jobs/queues/email.queue.js'

function orderNumber() {
  return `MR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

const orderItemsInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        },
      },
    },
  },
}

export const orderService = {
  create: async (userId, body, options = {}) => {
    const items = body.items || []
    if (!items.length) throw new ValidationError('Order must have at least one item')

    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const product = await prisma.product.findFirst({ where: { id: item.productId, deletedAt: null } })
      if (!product) throw new ValidationError(`Product ${item.productId} not found`)

      const qty = item.quantity || 1
      const inventory = await prisma.inventory.findFirst({ where: { productId: product.id } })
      const available = inventory ? inventory.currentStock - inventory.reservedStock : 0
      if (!options.skipStockCheck && available < qty) throw new ValidationError(`Insufficient stock for ${product.name}`)

      const unitPrice = Number(product.salePrice ?? product.price)
      subtotal += unitPrice * qty
      orderItems.push({ product, qty, unitPrice, variantId: item.variantId })
    }

    const tax = Number(body.tax || 0)
    const shipping = Number(body.shipping || 0)
    const discount = Number(body.discount || 0)
    const total = subtotal + tax + shipping - discount

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNumber(),
        userId,
        status: options.initialStatus || 'PENDING',
        paymentMethod: body.paymentMethod || 'COD',
        paymentStatus: body.paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
        subtotal,
        tax,
        shipping,
        discount,
        total,
        shippingAddress: body.shippingAddress,
        billingAddress: body.billingAddress,
        customerNotes: body.customerNotes,
        adminNotes: body.adminNotes,
        items: {
          create: orderItems.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            productName: i.product.name,
            sku: i.product.sku,
            quantity: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.unitPrice * i.qty,
          })),
        },
        statusHistory: {
          create: {
            status: options.initialStatus || 'PENDING',
            note: options.statusNote || 'Order placed',
            createdBy: options.createdBy,
          },
        },
        payments: {
          create: {
            method: body.paymentMethod || 'COD',
            status: 'PENDING',
            amount: total,
          },
        },
      },
      include: orderItemsInclude,
    })

    if (!options.skipStockCheck) {
      for (const item of orderItems) {
        const inv = await prisma.inventory.findFirst({ where: { productId: item.product.id } })
        if (!inv) continue

        const updated = await prisma.inventory.updateMany({
          where: { id: inv.id, currentStock: { gte: item.qty } },
          data: { currentStock: { decrement: item.qty } },
        })

        if (updated.count === 0) {
          await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } })
          throw new ValidationError(`Insufficient stock for ${item.product.name}`)
        }

        const newQty = inv.currentStock - item.qty
        await prisma.stockMovement.create({
          data: {
            productId: item.product.id,
            warehouseId: inv.warehouseId,
            userId,
            oldQty: inv.currentStock,
            newQty,
            difference: -item.qty,
            reason: 'SALE',
          },
        })
      }
    }

    await prisma.notification.create({
      data: {
        type: 'NEW_ORDER',
        title: 'New Order',
        message: `Order ${order.orderNumber} placed — $${order.total}`,
        data: { orderId: order.id },
      },
    })

    notifyAdmin('new_order', { orderId: order.id, orderNumber: order.orderNumber, total: order.total })

    broadcastLiveSale({
      productName: orderItems[0]?.product.name,
      city: body.shippingAddress?.city || 'your area',
      minutesAgo: 1,
    })

    if (body.customerEmail) {
      await emailQueue.add('order-confirmation', {
        to: body.customerEmail,
        orderNumber: order.orderNumber,
      })
    }

    return order
  },

  adminCreate: async (adminId, body) => {
    if (!body.userId) throw new ValidationError('Customer (userId) is required')
    return orderService.create(body.userId, body, {
      createdBy: adminId,
      initialStatus: body.status || 'CONFIRMED',
      statusNote: 'Order created by admin',
      skipStockCheck: Boolean(body.skipStockCheck),
    })
  },

  list: async (userId, isAdmin, query = {}) => {
    const where = isAdmin ? {} : { userId }
    if (query.status) where.status = query.status
    if (query.userId && isAdmin) where.userId = query.userId
    if (query.search && isAdmin) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerNotes: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
      ]
    }
    if (query.from) where.createdAt = { ...where.createdAt, gte: new Date(query.from) }
    if (query.to) where.createdAt = { ...where.createdAt, lte: new Date(query.to) }

    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          ...orderItemsInclude,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.order.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  },

  getById: async (id, userId, isAdmin) => {
    const order = await prisma.order.findFirst({
      where: isAdmin ? { id } : { id, userId },
      include: {
        ...orderItemsInclude,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    })
    if (!order) throw new ValidationError('Order not found')
    return order
  },

  updateStatus: async (id, status, note, adminId) => {
    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: { create: { status, note, createdBy: adminId } },
      },
      include: { items: true, user: { select: { email: true, firstName: true } } },
    })

    const { notifyAdmin } = await import('../../sockets/index.js')
    const eventMap = {
      CANCELLED: 'order_cancelled',
      REFUNDED: 'refund_request',
    }
    if (eventMap[status]) {
      notifyAdmin(eventMap[status], { orderId: order.id, orderNumber: order.orderNumber })
      await prisma.notification.create({
        data: {
          type: status === 'CANCELLED' ? 'ORDER_CANCELLED' : 'REFUND_REQUEST',
          title: status === 'CANCELLED' ? 'Order Cancelled' : 'Refund Request',
          message: `Order ${order.orderNumber} — ${status}`,
          data: { orderId: order.id },
        },
      })
    }

    return order
  },
}
