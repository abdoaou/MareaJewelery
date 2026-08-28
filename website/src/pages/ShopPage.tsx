import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../data/products'
import { api } from '../services/api'
import { mapApiProduct } from '../utils/mapProduct'
import { cached } from '../utils/clientCache'
import { getErrorMessage } from '../utils/errorMessage'
import ProductCard from '../components/ProductCard'
import LoadingAnimation from '../components/LoadingAnimation'
import LoadError from '../components/LoadError'

export default function ShopPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const bestSeller = params.get('bestSeller') === '1'
  const newArrival = params.get('newArrival') === '1'
  const newest = params.get('newest') === '1'
  const searchQuery = params.get('search')?.trim() || ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const title = useMemo(() => {
    if (searchQuery) return t('shop.searchResults', { query: searchQuery })
    if (bestSeller) return t('sections.bestSellers.title')
    if (newest || newArrival) return t('sections.newArrivals.title')
    return t('shop.allProducts')
  }, [bestSeller, newest, newArrival, searchQuery, t])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    return cached(`shop:${bestSeller}:${newArrival}:${newest}:${searchQuery}:${reloadKey}`, 60_000, async () => {
      const res = await api.getProducts({
        status: 'PUBLISHED',
        limit: 100,
        ...(bestSeller ? { bestSeller: true } : {}),
        ...(!newest && newArrival ? { newArrival: true } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      })
      return (res.data || []).map(mapApiProduct)
    })
      .then((items) => setProducts(items))
      .catch((err) => {
        setProducts([])
        setError(getErrorMessage(err, t('shop.loadFailed')))
      })
      .finally(() => setLoading(false))
  }, [bestSeller, newArrival, newest, searchQuery, reloadKey, t])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <h1 className="font-serif text-4xl text-marea-cream md:text-5xl">{title}</h1>

      {loading ? (
        <LoadingAnimation className="mt-16" />
      ) : error ? (
        <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
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
