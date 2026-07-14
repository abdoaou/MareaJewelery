import prisma from '../src/config/prisma.js'

try {
  await prisma.$connect()
  const [users, products, orders, categories] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
    prisma.category.count({ where: { deletedAt: null } }),
  ])
  console.log('DATABASE: CONNECTED')
  console.log('Users:', users)
  console.log('Products:', products)
  console.log('Orders:', orders)
  console.log('Categories:', categories)
  await prisma.$disconnect()
} catch (e) {
  console.log('DATABASE: FAILED')
  console.log(e.message)
  process.exit(1)
}
