import prisma from '../../config/prisma.js'
import { cacheGet, cacheSet, cacheDel } from '../../config/redis.js'

export const categoryRepository = {
  findTree: () =>
    prisma.category.findMany({
      where: { deletedAt: null, parentId: null },
      include: { children: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    }),

  findAll: async () => {
    const cached = await cacheGet('categories:all')
    if (cached) return cached

    const items = await prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        banner: true,
        icon: true,
        sortOrder: true,
        isFeatured: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
        parent: { select: { name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    await cacheSet('categories:all', items, 120)
    return items
  },

  findById: (id) => prisma.category.findFirst({ where: { id, deletedAt: null } }),

  findBySlug: (slug) =>
    prisma.category.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        _count: { select: { products: true } },
      },
    }),

  create: async (data) => {
    const row = await prisma.category.create({ data })
    await cacheDel('categories:*')
    return row
  },

  update: async (id, data) => {
    const row = await prisma.category.update({ where: { id }, data })
    await cacheDel('categories:*')
    return row
  },

  softDelete: async (id) => {
    const row = await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } })
    await cacheDel('categories:*')
    return row
  },
}
