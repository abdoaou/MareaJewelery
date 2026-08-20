import type { Product } from '../data/products'

export type ApiProductImage = {
  id?: string
  url: string
  alt?: string | null
  isPrimary?: boolean
  sortOrder?: number
}

export type ApiProduct = {
  id: string
  name: string
  slug: string
  description?: string | null
  shortDesc?: string | null
  price: number | string
  salePrice?: number | string | null
  status?: string
  isBestSeller?: boolean
  isNewArrival?: boolean
  isFeatured?: boolean
  isRecommended?: boolean
  sku?: string | null
  tags?: string[]
  images?: ApiProductImage[]
  category?: { id: string; name: string; slug: string } | null
  inventory?: Array<{ currentStock: number; reservedStock: number }>
  variants?: Array<{
    id: string
    name?: string | null
    sku?: string | null
    price?: number | string | null
    stock?: number | null
  }>
}

export type ProductDetail = Product & {
  images: string[]
  fullDescription: string
  categoryId?: string
  categorySlug?: string
  sku?: string
  tags: string[]
  variants: Array<{ id: string; name: string; price?: number; stock?: number }>
}

export function availableStock(inventory?: ApiProduct['inventory']) {
  if (!inventory?.length) return 0
  return inventory.reduce((sum, row) => sum + Math.max(0, row.currentStock - row.reservedStock), 0)
}

export function mapApiProduct(p: ApiProduct): Product {
  const basePrice = Number(p.price)
  const sale = p.salePrice != null ? Number(p.salePrice) : null
  const price = sale != null && !Number.isNaN(sale) ? sale : basePrice
  const originalPrice =
    sale != null && !Number.isNaN(sale) && basePrice > sale ? basePrice : undefined

  let badgeKey: string | undefined
  if (p.isBestSeller) badgeKey = 'badges.bestSeller'
  else if (p.isNewArrival) badgeKey = 'badges.new'
  else if (p.isFeatured) badgeKey = 'badges.featured'

  const primary =
    p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url || ''

  return {
    id: p.slug || p.id,
    apiSlug: p.slug,
    apiProductId: p.id,
    name: p.name,
    description: p.shortDesc || p.description || '',
    price,
    originalPrice,
    rating: 4.8,
    badgeKey,
    image: primary,
    categoryKey: p.category?.name || '',
    stock: availableStock(p.inventory),
  }
}

export function mapApiProductDetail(p: ApiProduct): ProductDetail {
  const base = mapApiProduct(p)
  const images = (p.images || []).map((img) => img.url).filter(Boolean)
  return {
    ...base,
    images: images.length ? images : base.image ? [base.image] : [],
    fullDescription: p.description || p.shortDesc || '',
    categoryId: p.category?.id,
    categorySlug: p.category?.slug,
    sku: p.sku || undefined,
    tags: Array.isArray(p.tags) ? p.tags : [],
    variants: (p.variants || []).map((v) => ({
      id: v.id,
      name: v.name || v.sku || 'Variant',
      price: v.price != null ? Number(v.price) : undefined,
      stock: v.stock != null ? Number(v.stock) : undefined,
    })),
  }
}
