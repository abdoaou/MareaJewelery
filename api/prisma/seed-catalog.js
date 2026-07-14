/**
 * Seed categories (with images) and products (with images).
 * Run: node prisma/seed-catalog.js
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  {
    slug: 'necklaces',
    name: 'Necklaces',
    description: 'Fine chains, pendants, and signature layers for luminous everyday rituals.',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    sortOrder: 1,
    isFeatured: true,
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    description: 'Delicate gold silhouettes crafted to move with light.',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=800&q=80',
    sortOrder: 2,
    isFeatured: true,
  },
  {
    slug: 'rings',
    name: 'Rings',
    description: 'Sculptural bands and diamond accents made for forever moments.',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
    sortOrder: 3,
    isFeatured: true,
  },
  {
    slug: 'earrings',
    name: 'Earrings',
    description: 'Polished studs, hoops, and drops for refined sparkle.',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
    sortOrder: 4,
    isFeatured: true,
  },
  {
    slug: 'gift-sets',
    name: 'Gift Sets',
    description: 'Curated pieces wrapped for anniversaries, weddings, and milestones.',
    image: 'https://images.unsplash.com/photo-1515562141201-7a88fb7ce338?w=800&q=80',
    sortOrder: 5,
    isFeatured: true,
  },
]

const products = [
  {
    slug: 'aurora-diamond-ring',
    name: 'Aurora Diamond Ring',
    sku: 'MR-AUR-001',
    categorySlug: 'rings',
    price: 189,
    salePrice: 160,
    description: '18k gold vermeil · zirconia',
    status: 'PUBLISHED',
    isFeatured: true,
    isBestSeller: true,
    stock: 24,
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e6?w=800&q=80',
    ],
  },
  {
    slug: 'luna-pearl-bracelet',
    name: 'Luna Pearl Bracelet',
    sku: 'MB-LUN-002',
    categorySlug: 'bracelets',
    price: 128,
    salePrice: 110,
    description: 'Freshwater pearl · gold vermeil',
    status: 'PUBLISHED',
    isBestSeller: true,
    stock: 12,
    images: [
      'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=800&q=80',
      'https://images.unsplash.com/photo-1611591436351-5b4c4e6e7c3a?w=800&q=80',
    ],
  },
  {
    slug: 'noor-gift-set',
    name: 'Noor Gift Set',
    sku: 'MG-NOO-003',
    categorySlug: 'gift-sets',
    price: 265,
    salePrice: 230,
    description: 'Necklace + bracelet set',
    status: 'PUBLISHED',
    isFeatured: true,
    stock: 18,
    images: [
      'https://images.unsplash.com/photo-1515562141201-7a88fb7ce338?w=800&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    ],
  },
  {
    slug: 'sera-gold-necklace',
    name: 'Sera Gold Necklace',
    sku: 'MN-SER-004',
    categorySlug: 'necklaces',
    price: 145,
    salePrice: 125,
    description: 'Gold-plated sterling silver',
    status: 'PUBLISHED',
    isNewArrival: true,
    stock: 30,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
      'https://images.unsplash.com/photo-1617038260897-41a9ad06a659?w=800&q=80',
    ],
  },
  {
    slug: 'mira-pave-earrings',
    name: 'Mira Pavé Earrings',
    sku: 'ME-MIR-005',
    categorySlug: 'earrings',
    price: 98,
    salePrice: 85,
    description: 'Sterling silver · pavé stones',
    status: 'PUBLISHED',
    isNewArrival: true,
    stock: 40,
    images: [
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80',
    ],
  },
  {
    slug: 'celine-stacking-band',
    name: 'Celine Stacking Band',
    sku: 'MR-CEL-006',
    categorySlug: 'rings',
    price: 76,
    description: 'Polished gold vermeil',
    status: 'PUBLISHED',
    isNewArrival: true,
    stock: 35,
    images: [
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e6?w=800&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
    ],
  },
  {
    slug: 'gold-bracelet',
    name: 'Gold Bracelet',
    sku: 'MB-GOLD-001',
    categorySlug: 'bracelets',
    price: 299.99,
    salePrice: 249.99,
    description: 'Classic gold bracelet from the Marea collection.',
    status: 'PUBLISHED',
    isFeatured: true,
    isBestSeller: true,
    stock: 50,
    images: [
      'https://images.unsplash.com/photo-1611591436351-5b4c4e6e7c3a?w=800&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=800&q=80',
    ],
  },
  {
    slug: 'silver-pendant-necklace',
    name: 'Silver Pendant Necklace',
    sku: 'MB-SLV-002',
    categorySlug: 'necklaces',
    price: 189.99,
    salePrice: 159.99,
    description: 'Elegant silver pendant necklace.',
    status: 'PUBLISHED',
    isNewArrival: true,
    stock: 25,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
      'https://images.unsplash.com/photo-1515562141201-7a88fb7ce338?w=800&q=80',
    ],
  },
  {
    slug: 'diamond-engagement-ring',
    name: 'Diamond Engagement Ring',
    sku: 'MB-DIA-003',
    categorySlug: 'rings',
    price: 1299.99,
    description: 'Brilliant diamond engagement ring.',
    status: 'PUBLISHED',
    isFeatured: true,
    stock: 8,
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e6?w=800&q=80',
    ],
  },
  {
    slug: 'pearl-earrings',
    name: 'Pearl Drop Earrings',
    sku: 'MB-PRL-004',
    categorySlug: 'earrings',
    price: 149.99,
    description: 'Soft pearl drops for evening light.',
    status: 'PUBLISHED',
    stock: 20,
    images: [
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80',
    ],
  },
  {
    slug: 'rose-gold-bangle',
    name: 'Rose Gold Bangle',
    sku: 'MB-RGD-005',
    categorySlug: 'bracelets',
    price: 349.99,
    salePrice: 299.99,
    description: 'Warm rose gold bangle for everyday wear.',
    status: 'PUBLISHED',
    stock: 15,
    images: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=800&q=80',
    ],
  },
  {
    slug: 'vintage-locket',
    name: 'Vintage Locket',
    sku: 'MB-VNT-006',
    categorySlug: 'necklaces',
    price: 219.99,
    description: 'Heirloom-inspired vintage locket.',
    status: 'PUBLISHED',
    stock: 10,
    images: [
      'https://images.unsplash.com/photo-1617038260897-41a9ad06a659?w=800&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    ],
  },
]

async function main() {
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

  const categoryBySlug = {}
  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        image: cat.image,
        sortOrder: cat.sortOrder,
        isFeatured: cat.isFeatured,
        isHidden: false,
        deletedAt: null,
        parentId: null,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        sortOrder: cat.sortOrder,
        isFeatured: cat.isFeatured,
      },
    })
    categoryBySlug[cat.slug] = record
    console.log(`Category: ${record.name} ✓`)
  }

  for (const p of products) {
    const category = categoryBySlug[p.categorySlug]
    if (!category) continue

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice ?? null,
        status: p.status,
        isFeatured: Boolean(p.isFeatured),
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
        categoryId: category.id,
        brandId: brand.id,
        deletedAt: null,
      },
      create: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice ?? null,
        costPrice: Number(p.price) * 0.4,
        status: p.status,
        isFeatured: Boolean(p.isFeatured),
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
        categoryId: category.id,
        brandId: brand.id,
        tags: [p.categorySlug],
      },
    })

    await prisma.productImage.deleteMany({ where: { productId: product.id } })
    await prisma.productImage.createMany({
      data: p.images.map((url, i) => ({
        productId: product.id,
        url,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    })

    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: { productId: product.id, warehouseId: warehouse.id },
      },
      update: { currentStock: p.stock },
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        currentStock: p.stock,
        lowStockThreshold: 5,
      },
    })

    console.log(`Product: ${product.name} (${p.images.length} images) ✓`)
  }

  console.log('\nCatalog seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
