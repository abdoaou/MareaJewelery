import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { api } from '../services/api'
import { mapApiProduct, mapApiProductDetail, type ProductDetail } from '../utils/mapProduct'
import type { Product } from '../data/products'
import { formatPrice } from '../utils/formatPrice'
import StockBadge from '../components/StockBadge'
import ProductCard from '../components/ProductCard'
import LoadingAnimation from '../components/LoadingAnimation'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useAuth } from '../context/AuthContext'
import { setPendingLike } from '../utils/pendingLike'
import { setPendingAdd } from '../utils/pendingCart'
import { cached } from '../utils/clientCache'

function loadDetail(slug: string): Promise<ProductDetail> {
  return cached(`product:detail:${slug}`, 60_000, async () => {
    const res = await api.getProductBySlug(slug)
    return mapApiProductDetail(res.data)
  })
}

async function loadSuggestions(detail: ProductDetail): Promise<Product[]> {
  return cached(`product:suggestions:${detail.apiProductId}`, 60_000, async () => {
    // Fetch same-category picks and best sellers in parallel, then merge
    const [categoryRes, bestRes] = await Promise.all([
      detail.categoryId
        ? api
            .getProducts({
              status: 'PUBLISHED',
              categoryId: detail.categoryId,
              excludeId: detail.apiProductId,
              limit: 4,
            })
            .catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      api
        .getProducts({
          status: 'PUBLISHED',
          bestSeller: true,
          excludeId: detail.apiProductId,
          limit: 4,
        })
        .catch(() => ({ data: [] })),
    ])

    const related: Product[] = []
    const seen = new Set<string>()
    for (const raw of [...(categoryRes.data || []), ...(bestRes.data || [])]) {
      const item = mapApiProduct(raw)
      const key = item.apiProductId || item.id
      if (!seen.has(key)) {
        related.push(item)
        seen.add(key)
      }
      if (related.length >= 4) break
    }

    if (related.length < 4) {
      const newest = await api
        .getProducts({ status: 'PUBLISHED', excludeId: detail.apiProductId, limit: 8 })
        .catch(() => ({ data: [] }))
      for (const raw of newest.data || []) {
        const item = mapApiProduct(raw)
        const key = item.apiProductId || item.id
        if (!seen.has(key)) {
          related.push(item)
          seen.add(key)
        }
        if (related.length >= 4) break
      }
    }

    return related.slice(0, 4)
  })
}

export default function ProductDetailsPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { customer } = useAuth()
  const { addToApi } = useCartStore()
  const { toggle, likedIds } = useWishlistStore()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')

  const liked = product?.apiProductId ? likedIds.includes(product.apiProductId) : false

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError('')
    setActiveImage(0)
    setSuggestions([])

    loadDetail(slug)
      .then((detail) => {
        if (cancelled) return
        // Show the product immediately; suggestions stream in below
        setProduct(detail)
        setLoading(false)

        loadSuggestions(detail)
          .then((related) => {
            if (!cancelled) setSuggestions(related)
          })
          .catch(() => {
            if (!cancelled) setSuggestions([])
          })
      })
      .catch((err) => {
        if (!cancelled) {
          setProduct(null)
          setSuggestions([])
          setError(err instanceof Error ? err.message : t('product.loadFailed'))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug, t])

  const images = useMemo(() => product?.images || [], [product])

  const handleAdd = async () => {
    if (!product?.apiProductId || product.stock <= 0 || adding) return
    if (!customer) {
      setPendingAdd({ productId: product.apiProductId, returnTo: location.pathname })
      navigate('/login', { state: { from: location.pathname, reason: 'addToCart' } })
      return
    }
    setAdding(true)
    setActionError('')
    try {
      await addToApi(product.apiProductId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('cart.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  const handleLike = () => {
    if (!product?.apiProductId) return
    setActionError('')
    if (!customer) {
      setPendingLike({ productId: product.apiProductId, returnTo: location.pathname })
      navigate('/login', { state: { from: location.pathname, reason: 'like' } })
      return
    }
    void toggle(product.apiProductId).catch((err) => {
      setActionError(err instanceof Error ? err.message : t('likes.failed'))
    })
  }

  if (loading) {
    return <LoadingAnimation className="py-24" />
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-red-400">{error || t('product.notFound')}</p>
        <Link to="/shop" className="btn-secondary mt-8 inline-flex">
          {t('sections.bestSellers.viewAll')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-marea-border bg-marea-bg-soft">
            {product.stock <= 0 && (
              <span className="absolute inset-x-0 bottom-0 z-10 bg-marea-bg/80 py-2 text-center text-xs font-semibold uppercase tracking-wider text-red-400 backdrop-blur-sm">
                {t('cart.soldOut')}
              </span>
            )}
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-marea-muted">
                {t('product.noImage')}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {images.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`aspect-square overflow-hidden rounded-xl border transition ${
                    index === activeImage
                      ? 'border-marea-gold ring-2 ring-marea-gold/40'
                      : 'border-marea-border hover:border-marea-gold/50'
                  }`}
                  aria-label={t('product.showImage', { index: index + 1 })}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.badgeKey && (
            <p className="section-label mb-3">{t(product.badgeKey)}</p>
          )}
          <h1 className="font-serif text-4xl text-marea-cream md:text-5xl">{product.name}</h1>
          {product.categoryKey && (
            <Link
              to={product.categorySlug ? `/category/${product.categorySlug}` : '/shop'}
              className="mt-3 inline-block text-sm text-marea-gold hover:underline"
            >
              {product.categoryKey}
            </Link>
          )}

          <div className="mt-6 flex items-center gap-4">
            <span className="price-en text-2xl font-medium text-marea-gold">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="price-en text-marea-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="price-en flex items-center gap-1 text-sm text-marea-muted">
              <Star size={14} className="fill-marea-gold text-marea-gold" />
              {product.rating}
            </span>
          </div>

          <div className="mt-4">
            <StockBadge stock={product.stock} />
          </div>

          {product.fullDescription && (
            <p className="mt-6 leading-relaxed text-marea-muted">{product.fullDescription}</p>
          )}

          {product.sku && (
            <p className="mt-4 text-sm text-marea-muted">
              {t('product.sku')}: <span className="text-marea-cream">{product.sku}</span>
            </p>
          )}

          {product.variants.length > 0 && (
            <div className="mt-6">
              <p className="text-sm uppercase tracking-wider text-marea-muted">{t('product.variants')}</p>
              <ul className="mt-2 space-y-2">
                {product.variants.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-marea-border px-3 py-2 text-sm"
                  >
                    <span>{v.name}</span>
                    {v.price != null && (
                      <span className="price-en text-marea-gold">{formatPrice(v.price)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {actionError && <p className="mt-4 text-sm text-red-400">{actionError}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAdd}
              disabled={product.stock <= 0 || adding}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              <ShoppingBag size={16} className="inline me-2" />
              {product.stock <= 0
                ? t('cart.soldOut')
                : adding
                  ? t('common.loading')
                  : t('cart.addToCart')}
            </button>
            <button
              type="button"
              onClick={handleLike}
              className="btn-secondary flex items-center justify-center gap-2"
              aria-label={liked ? t('likes.unlike') : t('likes.like')}
            >
              <Heart size={16} className={liked ? 'fill-marea-gold text-marea-gold' : ''} />
              {liked ? t('likes.unlike') : t('likes.like')}
            </button>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <section className="mt-20">
          <p className="section-label mb-3">{t('product.suggestionsLabel')}</p>
          <h2 className="font-serif text-3xl text-marea-cream">{t('product.suggestionsTitle')}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.map((item) => (
              <ProductCard key={item.apiProductId || item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
