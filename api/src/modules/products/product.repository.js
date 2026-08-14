import prisma from '../../config/prisma.js'
import { cacheGet, cacheSet, cacheDel } from '../../config/redis.js'

function listCacheKey(query) {
  return `products:list:${JSON.stringify({
    page: query.page || 1,
    limit: query.limit || 20,
    search: query.search || '',
    categoryId: query.categoryId || '',
    categorySlug: query.categorySlug || '',
    status: query.status || '',
    featured: query.featured ?? '',
    bestSeller: query.bestSeller ?? '',
    newArrival: query.newArrival ?? '',
    recommended: query.recommended ?? '',
    excludeId: query.excludeId || '',
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder || 'desc',
  })}`
}

export const productRepository = {
  findMany: async (query = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      categorySlug,
      status,
      featured,
      bestSeller,
      newArrival,
      recommended,
      excludeId,
      sortBy: sortByParam,
      sortOrder: sortOrderParam,
    } = query

    const sortBy = sortByParam === 'price' ? 'price' : 'createdAt'
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc'

    const cacheKey = listCacheKey(query)
    const cached = await cacheGet(cacheKey)
    if (cached) return cached

    const where = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (categorySlug) {
      where.category = { slug: categorySlug, deletedAt: null }
    }
    if (status) where.status = status
    if (featured !== undefined) where.isFeatured = featured === 'true' || featured === true
    if (bestSeller !== undefined) where.isBestSeller = bestSeller === 'true' || bestSeller === true
    if (newArrival !== undefined) where.isNewArrival = newArrival === 'true' || newArrival === true
    if (recommended !== undefined) where.isRecommended = recommended === 'true' || recommended === true
    if (excludeId) where.id = { not: String(excludeId) }

    const pageNum = Number(page) || 1
    const limitNum = Math.min(Number(limit) || 20, 100)

    // Sequential queries use 1 pool connection better than Promise.all under Supabase limits
    const items = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        sku: true,
        status: true,
        price: true,
        salePrice: true,
        isFeatured: true,
        isBestSeller: true,
        isNewArrival: true,
        isRecommended: true,
        createdAt: true,
        viewCount: true,
        categoryId: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { id: true, url: true, isPrimary: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { currentStock: true, reservedStock: true } },
        _count: { select: { orderItems: true } },
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy:
        recommended === 'true' || recommended === true
          ? [{ isRecommended: 'desc' }, { isBestSeller: 'desc' }, { [sortBy]: sortOrder }]
          : [{ [sortBy]: sortOrder }],
    })
    const total = await prisma.product.count({ where })

    const result = {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    }
    await cacheSet(cacheKey, result, 60)
    return result
  },

  findById: (id) =>
    prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: true,
        brand: true,
        category: true,
        inventory: true,
      },
    }),

  findBySlug: async (slug) => {
    const cacheKey = `products:slug:${slug}`
    const cached = await cacheGet(cacheKey)
    if (cached) return cached

    const product = await prisma.product.findFirst({
      where: { slug, deletedAt: null, status: 'PUBLISHED' },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: true,
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { currentStock: true, reservedStock: true } },
      },
    })
    if (product) await cacheSet(cacheKey, product, 60)
    return product
  },

  create: async (data) => {
    const product = await prisma.product.create({ data, include: { images: true } })
    await invalidateProductCache()
    return product
  },

  update: async (id, data) => {
    const product = await prisma.product.update({ where: { id }, data })
    await invalidateProductCache()
    return product
  },

  softDelete: async (id) => {
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    })
    await invalidateProductCache()
    return product
  },

  restore: async (id) => {
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: null, status: 'DRAFT' },
    })
    await invalidateProductCache()
    return product
  },
}

export async function getCachedProducts(key, fetcher, ttl = 300) {
  const cached = await cacheGet(key)
  if (cached) return cached
  const data = await fetcher()
  await cacheSet(key, data, ttl)
  return data
}

export async function invalidateProductCache() {
  await cacheDel('products:*')
}
