import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../data/products'
import { api } from '../services/api'
import { mapApiProduct } from '../utils/mapProduct'
import { cached } from '../utils/clientCache'
import ProductCard from '../components/ProductCard'
import LoadingAnimation from '../components/LoadingAnimation'

export default function ShopPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const bestSeller = params.get('bestSeller') === '1'
  const newArrival = params.get('newArrival') === '1'
  const newest = params.get('newest') === '1'
  const searchQuery = params.get('search')?.trim() || ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const title = useMemo(() => {
    if (searchQuery) return t('shop.searchResults', { query: searchQuery })
    if (bestSeller) return t('sections.bestSellers.title')
    if (newest || newArrival) return t('sections.newArrivals.title')
    return t('shop.allProducts')
  }, [bestSeller, newest, newArrival, searchQuery, t])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    cached(`shop:${bestSeller}:${newArrival}:${newest}:${searchQuery}`, 60_000, async () => {
      const res = await api.getProducts({
        status: 'PUBLISHED',
        limit: 100,
        ...(bestSeller ? { bestSeller: true } : {}),
        // newest=1 = createdAt desc (API default); newArrival keeps the flag filter
        ...(!newest && newArrival ? { newArrival: true } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      })
      return (res.data || []).map(mapApiProduct)
    })
      .then((items) => {
        if (!cancelled) setProducts(items)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bestSeller, newArrival, newest, searchQuery])

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <h1 className="font-serif text-4xl text-marea-cream md:text-5xl">{title}</h1>

      {loading ? (
        <LoadingAnimation className="mt-16" />
      ) : products.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-marea-muted">
            {searchQuery ? t('shop.searchEmpty', { query: searchQuery }) : t('shop.empty')}
          </p>
          <Link to="/" className="btn-primary mt-8 inline-flex">
            {t('hero.shopCollection')}
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.apiProductId || product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
