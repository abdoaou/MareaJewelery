import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../data/products'
import { api } from '../services/api'
import { mapApiProduct } from '../utils/mapProduct'
import ProductCard from '../components/ProductCard'
import LoadingAnimation from '../components/LoadingAnimation'

export default function CategoryPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      api.getCategoryBySlug(slug),
      api.getProducts({ status: 'PUBLISHED', categorySlug: slug, limit: 100 }),
    ])
      .then(([catRes, prodRes]) => {
        if (cancelled) return
        setTitle(catRes.data.name)
        setDescription(catRes.data.description || '')
        setProducts((prodRes.data || []).map(mapApiProduct))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('shop.loadFailed'))
        setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, t])

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <p className="section-label mb-3">{t('sections.shopByCategory.label')}</p>
      <h1 className="font-serif text-4xl text-marea-cream md:text-5xl">
        {title || t('shop.categoryFallback')}
      </h1>
      {description ? <p className="mt-4 max-w-2xl text-marea-muted">{description}</p> : null}

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {loading ? (
        <LoadingAnimation className="mt-16" />
      ) : products.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-marea-muted">{t('shop.emptyCategory')}</p>
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
