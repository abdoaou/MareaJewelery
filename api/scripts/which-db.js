import prisma from '../src/config/prisma.js'
import { env } from '../src/config/env.js'

function maskUrl(url) {
  if (!url) return '(not set)'
  return url.replace(/:([^:@]+)@/, ':****@')
}

try {
  await prisma.$connect()

  const dbUrl = process.env.DATABASE_URL || env.databaseUrl
  const projectRef = dbUrl?.match(/postgres\.([^:]+)/)?.[1] || 'unknown'

  const users = await prisma.user.findMany({
    select: { email: true, firstName: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 10,
  })

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { name: true, slug: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 10,
  })

  const [userCount, productCount, orderCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
  ])

  console.log('=== ACTIVE DATABASE ===')
  console.log('Project ref:', projectRef)
  console.log('DATABASE_URL:', maskUrl(dbUrl))
  console.log('')
  console.log('Counts:', { users: userCount, products: productCount, orders: orderCount })
  console.log('')
  console.log('Users:')
  users.forEach((u) => console.log(`  - ${u.email} (${u.role})`))
  console.log('')
  console.log('Products:')
  products.forEach((p) => console.log(`  - ${p.name} [${p.slug}]`))

  await prisma.$disconnect()
} catch (e) {
  console.log('Connection failed:', e.message)
  process.exit(1)
}
