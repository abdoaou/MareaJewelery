import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@marea.com' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'admin@marea.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { name: 'Main Warehouse', code: 'MAIN', city: 'Beirut', country: 'Lebanon' },
  })

  await prisma.liveSalePopup.findFirst().then(async (existing) => {
    if (!existing) await prisma.liveSalePopup.create({ data: { isEnabled: true, popupDelay: 5 } })
  })

  const category = await prisma.category.upsert({
    where: { slug: 'bracelets' },
    update: {},
    create: {
      name: 'Bracelets',
      slug: 'bracelets',
      description: 'Handcrafted bracelets',
      isFeatured: true,
      sortOrder: 1,
    },
  })

  const product = await prisma.product.upsert({
    where: { slug: 'gold-bracelet' },
    update: {},
    create: {
      name: 'Gold Bracelet',
      slug: 'gold-bracelet',
      description: 'Elegant 18k gold bracelet',
      sku: 'MB-GOLD-001',
      status: 'PUBLISHED',
      isFeatured: true,
      isBestSeller: true,
      price: 299.99,
      salePrice: 249.99,
      categoryId: category.id,
      tags: ['gold', 'bracelet', 'jewelry'],
    },
  })

  await prisma.inventory.upsert({
    where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
    update: { currentStock: 50 },
    create: {
      productId: product.id,
      warehouseId: warehouse.id,
      currentStock: 50,
      lowStockThreshold: 5,
    },
  })

  console.log('Seed complete:', { admin: admin.email, warehouse: warehouse.code, product: product.slug })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
