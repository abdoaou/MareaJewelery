/**
 * Create many orders for one customer (bulk test).
 * Run: node prisma/seed-bulk-orders.js
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const customer = await prisma.user.findUnique({ where: { email: 'ahmed@example.com' } })
  if (!customer) throw new Error('Customer ahmed@example.com not found — run seed-demo first')

  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: 'PUBLISHED' },
    take: 5,
  })
  if (!products.length) throw new Error('No products found')

  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
  let created = 0

  for (let i = 0; i < 25; i++) {
    const product = products[i % products.length]
    const qty = 1 + (i % 3)
    const unitPrice = Number(product.salePrice ?? product.price)
    const total = unitPrice * qty
    const orderNum = `MR-BULK-AHMED-${2000 + i}`
    const exists = await prisma.order.findUnique({ where: { orderNumber: orderNum } })
    if (exists) continue

    const daysAgo = i
    const createdAt = new Date(Date.now() - daysAgo * 3600000 * 6)

    await prisma.order.create({
      data: {
        orderNumber: orderNum,
        userId: customer.id,
        status: statuses[i % statuses.length],
        paymentMethod: 'COD',
        paymentStatus: i % 2 === 0 ? 'PAID' : 'PENDING',
        subtotal: total,
        total,
        shippingAddress: { line1: 'Verdun Street', city: 'Beirut', country: 'Lebanon' },
        customerNotes: 'Bulk test order',
        adminNotes: 'Generated for admin testing',
        createdAt,
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: qty,
            unitPrice,
            lineTotal: total,
          },
        },
        statusHistory: { create: { status: 'PENDING', note: 'Bulk seed', createdAt } },
        payments: { create: { method: 'COD', status: 'PENDING', amount: total, createdAt } },
      },
    })
    created++
  }

  const totalForCustomer = await prisma.order.count({ where: { userId: customer.id } })
  console.log(`Bulk orders: created ${created} new. Ahmed total orders: ${totalForCustomer}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
