import prisma from '../../config/prisma.js'
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js'

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  likeCount: true,
  status: true,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    take: 1,
    select: { url: true },
  },
}

export const wishlistService = {
  list: async (userId) => {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      include: { product: { select: productSelect } },
      orderBy: { createdAt: 'desc' },
    })
    return items
      .filter((w) => w.product && w.product.status === 'PUBLISHED')
      .map((w) => ({
        id: w.id,
        productId: w.productId,
        createdAt: w.createdAt,
        product: {
          id: w.product.id,
          name: w.product.name,
          slug: w.product.slug,
          price: w.product.price,
          salePrice: w.product.salePrice,
          likeCount: w.product.likeCount,
          image: w.product.images?.[0]?.url,
        },
      }))
  },

  ids: async (userId) => {
    const rows = await prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    })
    return rows.map((r) => r.productId)
  },

  toggle: async (userId, productId) => {
    // Prefer delete-first: one round-trip tells us like vs unlike
    const removed = await prisma.wishlist.deleteMany({
      where: { userId, productId },
    })

    if (removed.count > 0) {
      await prisma.$executeRaw`
        UPDATE products
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = ${productId}
      `
      return { liked: false, productId }
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true },
    })
    if (!product) throw new NotFoundError('Product')

    try {
      await prisma.wishlist.create({ data: { userId, productId } })
    } catch {
      return { liked: true, productId }
    }

    await prisma.$executeRaw`
      UPDATE products SET like_count = like_count + 1 WHERE id = ${productId}
    `
    return { liked: true, productId }
  },

  add: async (userId, productId) => {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true },
    })
    if (!product) throw new NotFoundError('Product')

    try {
      await prisma.wishlist.create({ data: { userId, productId } })
      await prisma.$executeRaw`
        UPDATE products SET like_count = like_count + 1 WHERE id = ${productId}
      `
    } catch {
      return { liked: true, productId }
    }
    return { liked: true, productId }
  },

  remove: async (userId, productId) => {
    const removed = await prisma.wishlist.deleteMany({
      where: { userId, productId },
    })
    if (!removed.count) throw new ValidationError('Product is not in your likes')

    await prisma.$executeRaw`
      UPDATE products
      SET like_count = GREATEST(0, like_count - 1)
      WHERE id = ${productId}
    `
    return { liked: false, productId }
  },
}
