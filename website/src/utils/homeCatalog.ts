import { api } from '../services/api'
import type { Product } from '../data/products'
import { mapApiProduct, type ApiProduct } from './mapProduct'
import { cached } from './clientCache'

type CategoryRow = {
  id: string
  slug: string
  name: string
  description?: string | null
  image?: string | null
  sortOrder?: number
  isHidden?: boolean
}

export function loadCategories(): Promise<CategoryRow[]> {
  return cached('categories', 120_000, async () => {
    const res = await api.getCategories()
    return (res.data || []) as CategoryRow[]
  })
}

export function loadBestSellerProducts(): Promise<Product[]> {
  return cached('home:bestSellers', 60_000, async () => {
    const res = await api.getProducts({ status: 'PUBLISHED', bestSeller: true, limit: 12 })
    return ((res.data || []) as ApiProduct[]).map(mapApiProduct)
  })
}

/** Newest published products (API default order: createdAt desc). */
export function loadNewArrivalProducts(): Promise<Product[]> {
  return cached('home:newest', 60_000, async () => {
    const res = await api.getProducts({ status: 'PUBLISHED', limit: 12 })
    return ((res.data || []) as ApiProduct[]).map(mapApiProduct)
  })
}
