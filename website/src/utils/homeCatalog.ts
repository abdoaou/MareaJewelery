import { api } from '../services/api'
import type { Product } from '../data/products'
import { mapApiProduct, type ApiProduct } from './mapProduct'

type CategoryRow = {
  id: string
  slug: string
  name: string
  description?: string | null
  image?: string | null
  sortOrder?: number
  isHidden?: boolean
}

let productsPromise: Promise<ApiProduct[]> | null = null
let categoriesPromise: Promise<CategoryRow[]> | null = null

export function loadPublishedProducts(): Promise<ApiProduct[]> {
  if (!productsPromise) {
    productsPromise = api
      .getProducts({ status: 'PUBLISHED', limit: 48 })
      .then((res) => (res.data || []) as ApiProduct[])
      .catch((err) => {
        productsPromise = null
        throw err
      })
  }
  return productsPromise
}

export function loadCategories(): Promise<CategoryRow[]> {
  if (!categoriesPromise) {
    categoriesPromise = api
      .getCategories()
      .then((res) => (res.data || []) as CategoryRow[])
      .catch((err) => {
        categoriesPromise = null
        throw err
      })
  }
  return categoriesPromise
}

export async function loadBestSellerProducts(): Promise<Product[]> {
  const all = await loadPublishedProducts()
  const flagged = all.filter((p) => p.isBestSeller).map(mapApiProduct)
  if (flagged.length) return flagged.slice(0, 12)
  return all.slice(0, 12).map(mapApiProduct)
}

export async function loadNewArrivalProducts(): Promise<Product[]> {
  const all = await loadPublishedProducts()
  const flagged = all.filter((p) => p.isNewArrival).map(mapApiProduct)
  if (flagged.length) return flagged.slice(0, 12)
  return all.slice(0, 12).map(mapApiProduct)
}
