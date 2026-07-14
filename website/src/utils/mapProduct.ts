import type { Product } from '../data/products'

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
  images?: Array<{ url: string; isPrimary?: boolean }>
  category?: { id: string; name: string; slug: string } | null
  inventory?: Array<{ currentStock: number; reservedStock: number }>
}

function availableStock(inventory?: ApiProduct['inventory']) {
  if (!inventory?.length) return 99
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
