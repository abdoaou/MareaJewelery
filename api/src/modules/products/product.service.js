import { productRepository, invalidateProductCache } from './product.repository.js'
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js'
import { deleteStoredImage } from '../../shared/storage/r2.js'
import { logger } from '../../shared/utils/logger.js'
import prisma from '../../config/prisma.js'

const MAX_PRODUCT_IMAGES = 5

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const productService = {
  list: (query) => productRepository.findMany(query),
  getById: async (id) => {
    const product = await productRepository.findById(id)
    if (!product) throw new NotFoundError('Product')
    return product
  },
  getBySlug: async (slug) => {
    const product = await productRepository.findBySlug(slug)
    if (!product) throw new NotFoundError('Product')
    return product
  },
  create: async (data) => {
    const { initialStock, ...productData } = data
    const product = await productRepository.create({
      ...productData,
      slug: data.slug || slugify(data.name),
      tags: data.tags || [],
      status: data.status || 'PUBLISHED',
    })

    const stock = Number(initialStock)
    if (Number.isFinite(stock) && stock > 0) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      if (warehouse) {
        await prisma.inventory.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            currentStock: Math.floor(stock),
          },
        })
      }
    }

    await invalidateProductCache()
    return productRepository.findById(product.id)
  },
  update: async (id, data) => {
    await productService.getById(id)
    const { initialStock: _stock, ...productData } = data
    const product = await productRepository.update(id, productData)
    await invalidateProductCache()
    return product
  },
  remove: async (id) => {
    await productService.getById(id)
    await productRepository.softDelete(id)
    await invalidateProductCache()
  },
  restore: async (id) => productRepository.restore(id),
  duplicate: async (id) => {
    const product = await productService.getById(id)
    return productRepository.create({
      name: `${product.name} (Copy)`,
      slug: `${product.slug}-copy-${Date.now()}`,
      sku: product.sku ? `${product.sku}-COPY-${Date.now()}` : undefined,
      description: product.description,
      shortDesc: product.shortDesc,
      categoryId: product.categoryId,
      brandId: product.brandId,
      price: product.price,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      status: 'DRAFT',
      tags: product.tags || [],
      images: product.images?.length
        ? { create: product.images.map(({ url, alt, sortOrder, isPrimary }) => ({ url, alt, sortOrder, isPrimary })) }
        : undefined,
    })
  },
  addImages: async (id, images) => {
    if (!images?.length) throw new ValidationError('At least one image is required')
    const product = await productService.getById(id)
    const existing = product.images?.length || 0
    if (existing + images.length > MAX_PRODUCT_IMAGES) {
      throw new ValidationError(`A product can have at most ${MAX_PRODUCT_IMAGES} images`)
    }

    const hasPrimaryInPayload = images.some((img) => img.isPrimary)
    if (hasPrimaryInPayload || existing === 0) {
      await prisma.productImage.updateMany({ where: { productId: id }, data: { isPrimary: false } })
    }

    await prisma.productImage.createMany({
      data: images.map((img, i) => ({
        productId: id,
        url: img.url,
        alt: img.alt,
        sortOrder: img.sortOrder ?? existing + i,
        isPrimary: img.isPrimary ?? (!hasPrimaryInPayload && existing === 0 && i === 0),
      })),
    })
    return productRepository.findById(id)
  },
  removeImage: async (productId, imageId) => {
    const product = await productService.getById(productId)
    if ((product.images?.length || 0) <= 1) {
      throw new ValidationError('A product must have at least 1 image')
    }
    const removed = product.images.find((img) => img.id === imageId)
    if (!removed) throw new NotFoundError('Image')

    await prisma.productImage.deleteMany({ where: { id: imageId, productId } })

    try {
      await deleteStoredImage(removed.url)
    } catch (err) {
      logger.warn('Failed to delete product image from storage', {
        productId,
        imageId,
        url: removed.url,
        error: err.message,
      })
    }

    if (removed.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      })
      if (next) {
        await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } })
      }
    }
    await invalidateProductCache()
    return productRepository.findById(productId)
  },
  setPrimaryImage: async (productId, imageId) => {
    await productService.getById(productId)
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } })
    if (!image) throw new NotFoundError('Image')
    await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })
    await prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } })
    return productRepository.findById(productId)
  },
}
