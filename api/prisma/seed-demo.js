/**
 * Demo data for admin dashboard testing.
 * Run: node prisma/seed-demo.js
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const customerHash = await bcrypt.hash('Customer@123', 12)

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { name: 'Main Warehouse', code: 'MAIN', city: 'Beirut', country: 'Lebanon' },
  })

  const brand = await prisma.brand.upsert({
    where: { slug: 'marea' },
    update: {},
    create: { name: 'Marea', slug: 'marea', country: 'Lebanon' },
  })

  const catBracelets = await prisma.category.upsert({
    where: { slug: 'bracelets' },
    update: {},
    create: { name: 'Bracelets', slug: 'bracelets', description: 'Handcrafted bracelets', isFeatured: true, sortOrder: 1 },
  })

  const catNecklaces = await prisma.category.upsert({
    where: { slug: 'necklaces' },
    update: {},
    create: { name: 'Necklaces', slug: 'necklaces', description: 'Elegant necklaces', isFeatured: true, sortOrder: 2 },
  })

  const catRings = await prisma.category.upsert({
    where: { slug: 'rings' },
    update: {},
    create: { name: 'Rings', slug: 'rings', description: 'Fine rings', parentId: catBracelets.id, sortOrder: 3 },
  })

  const products = [
    {
      slug: 'gold-bracelet',
      name: 'Gold Bracelet',
      sku: 'MB-GOLD-001',
      price: 299.99,
      salePrice: 249.99,
      status: 'PUBLISHED',
      isFeatured: true,
      isBestSeller: true,
      viewCount: 420,
      likeCount: 38,
      stock: 50,
      categoryId: catBracelets.id,
      tags: ['gold', 'bracelet'],
      image: 'https://images.unsplash.com/photo-1611591436351-5b4c4e6e7c3a?w=400',
    },
    {
      slug: 'silver-pendant-necklace',
      name: 'Silver Pendant Necklace',
      sku: 'MB-SLV-002',
      price: 189.99,
      salePrice: 159.99,
      status: 'PUBLISHED',
      isNewArrival: true,
      viewCount: 310,
      likeCount: 22,
      stock: 25,
      categoryId: catNecklaces.id,
      tags: ['silver', 'necklace'],
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
    },
    {
      slug: 'diamond-engagement-ring',
      name: 'Diamond Engagement Ring',
      sku: 'MB-DIA-003',
      price: 1299.99,
      status: 'PUBLISHED',
      isFeatured: true,
      viewCount: 890,
      likeCount: 95,
      stock: 8,
      categoryId: catRings.id,
      tags: ['diamond', 'ring'],
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
    },
    {
      slug: 'pearl-earrings',
      name: 'Pearl Drop Earrings',
      sku: 'MB-PRL-004',
      price: 149.99,
      status: 'PUBLISHED',
      viewCount: 156,
      likeCount: 14,
      stock: 3,
      categoryId: catNecklaces.id,
      tags: ['pearl', 'earrings'],
      image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
    },
    {
      slug: 'rose-gold-bangle',
      name: 'Rose Gold Bangle',
      sku: 'MB-RGD-005',
      price: 349.99,
      salePrice: 299.99,
      status: 'HIDDEN',
      viewCount: 78,
      likeCount: 6,
      stock: 15,
      categoryId: catBracelets.id,
      tags: ['rose-gold'],
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
    },
    {
      slug: 'vintage-locket',
      name: 'Vintage Locket',
      sku: 'MB-VNT-006',
      price: 219.99,
      status: 'DRAFT',
      viewCount: 12,
      likeCount: 1,
      stock: 0,
      categoryId: catNecklaces.id,
      tags: ['vintage'],
      image: 'https://images.unsplash.com/photo-1617038260897-41a9ad06a659?w=400',
    },
  ]

  const productRecords = []
  for (const p of products) {
    const { stock, image, ...data } = p
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        status: p.status,
      },
      create: {
        ...data,
        brandId: brand.id,
        description: `Beautiful ${p.name} from Marea Jewelry collection.`,
        costPrice: Number(p.price) * 0.4,
      },
    })

    const existingImg = await prisma.productImage.findFirst({ where: { productId: product.id } })
    if (!existingImg && image) {
      await prisma.productImage.create({
        data: { productId: product.id, url: image, isPrimary: true, sortOrder: 0 },
      })
    }

    await prisma.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
      update: { currentStock: stock },
      create: { productId: product.id, warehouseId: warehouse.id, currentStock: stock, lowStockThreshold: 5 },
    })

    productRecords.push(product)
  }

  const customers = []
  for (const c of [
    { email: 'sarah@example.com', firstName: 'Sarah', lastName: 'Khoury' },
    { email: 'ahmed@example.com', firstName: 'Ahmed', lastName: 'Haddad' },
    { email: 'layla@example.com', firstName: 'Layla', lastName: 'Mansour' },
    { email: 'omar@example.com', firstName: 'Omar', lastName: 'Fadel' },
  ]) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        ...c,
        passwordHash: customerHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
        rewardPoints: Math.floor(Math.random() * 500),
      },
    })
    customers.push(user)
  }

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off first order',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: true,
    },
  })

  const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
  const existingOrders = await prisma.order.count()
  if (existingOrders < 8) {
    for (let i = 0; i < 12; i++) {
      const customer = customers[i % customers.length]
      const product = productRecords[i % productRecords.length]
      const qty = 1 + (i % 2)
      const unitPrice = Number(product.salePrice ?? product.price)
      const total = unitPrice * qty
      const daysAgo = i * 2
      const createdAt = new Date(Date.now() - daysAgo * 86400000)
      const status = orderStatuses[i % orderStatuses.length]

      const order = await prisma.order.create({
        data: {
          orderNumber: `MR-DEMO-${1000 + i}`,
          userId: customer.id,
          status,
          paymentMethod: i % 3 === 0 ? 'COD' : 'STRIPE',
          paymentStatus: status === 'DELIVERED' ? 'PAID' : 'PENDING',
          subtotal: total,
          total,
          shippingAddress: { line1: 'Hamra Street', city: 'Beirut', country: 'Lebanon' },
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
          statusHistory: { create: { status, note: 'Demo order', createdAt } },
          payments: {
            create: { method: 'COD', status: status === 'DELIVERED' ? 'PAID' : 'PENDING', amount: total },
          },
        },
      })

      if (i === 0) {
        await prisma.review.create({
          data: {
            productId: product.id,
            userId: customer.id,
            orderId: order.id,
            authorName: `${customer.firstName} ${customer.lastName}`,
            rating: 5,
            comment: 'Absolutely stunning piece! Exceeded my expectations.',
            status: 'APPROVED',
            verifiedPurchase: true,
          },
        })
      }
    }
  }

  await prisma.productQuestion.createMany({
    data: [
      { productId: productRecords[0].id, userId: customers[0].id, question: 'Is this available in size 7?', answer: 'Yes, we can adjust the size.', isApproved: true },
      { productId: productRecords[2].id, userId: customers[1].id, question: 'What carat is the diamond?', isApproved: false },
    ],
    skipDuplicates: true,
  })

  const notifTypes = [
    { type: 'NEW_ORDER', title: 'New Order', message: 'Order MR-DEMO-1001 placed — $249.99' },
    { type: 'LOW_STOCK', title: 'Low Stock', message: 'Pearl Drop Earrings has only 3 units left' },
    { type: 'OUT_OF_STOCK', title: 'Out of Stock', message: 'Vintage Locket is out of stock' },
    { type: 'NEW_REVIEW', title: 'New Review', message: '5-star review on Gold Bracelet' },
    { type: 'QUESTION_SUBMITTED', title: 'New Question', message: 'Customer asked about diamond carat' },
  ]

  for (const n of notifTypes) {
    const exists = await prisma.notification.findFirst({ where: { message: n.message } })
    if (!exists) await prisma.notification.create({ data: n })
  }

  console.log('Demo seed complete:', {
    categories: 3,
    products: productRecords.length,
    customers: customers.length,
    brand: brand.name,
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
