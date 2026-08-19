import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Star, ShoppingBag, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product } from '../data/products'
import StockBadge from './StockBadge'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useAuth } from '../context/AuthContext'
import { useProductCatalog } from '../context/ProductCatalogContext'
import { setPendingLike } from '../utils/pendingLike'
import { setPendingAdd } from '../utils/pendingCart'
import { formatPrice } from '../utils/formatPrice'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { addToApi } = useCartStore()
  const { toggle, likedIds } = useWishlistStore()
  const { customer } = useAuth()
  const { resolveApiId } = useProductCatalog()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [resolvedId, setResolvedId] = useState(product.apiProductId || '')
  const [heartPop, setHeartPop] = useState(false)

  const name = product.name || t(`products.${product.id}.name`, product.id)
  const description =
    product.description !== undefined
      ? product.description
      : t(`products.${product.id}.description`, '')
  const badge = product.badgeKey ? t(product.badgeKey) : undefined
  const liked = resolvedId ? likedIds.includes(resolvedId) : false
  const detailPath = `/product/${product.apiSlug || product.id}`

  const resolveId = async () => {
    if (resolvedId) return resolvedId
    if (product.apiProductId) {
      setResolvedId(product.apiProductId)
      return product.apiProductId
    }
    const id = await resolveApiId(product.apiSlug)
    if (id) setResolvedId(id)
    return id
  }

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setHeartPop(true)
    window.setTimeout(() => setHeartPop(false), 280)

    const knownId = product.apiProductId || resolvedId
    if (knownId) {
      if (!resolvedId) setResolvedId(knownId)
      if (!customer) {
        setPendingLike({ productId: knownId, returnTo: location.pathname })
        navigate('/login', { state: { from: location.pathname, reason: 'like' } })
        return
      }
      void toggle(knownId).catch((err) => {
        setError(err instanceof Error ? err.message : t('likes.failed'))
      })
      return
    }

    void (async () => {
      const productId = await resolveId()
      if (!productId) {
        setError(t('likes.failed'))
        return
      }
      if (!customer) {
        setPendingLike({ productId, returnTo: location.pathname })
        navigate('/login', { state: { from: location.pathname, reason: 'like' } })
        return
      }
      try {
        await toggle(productId)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('likes.failed'))
      }
    })()
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock <= 0 || adding) return

    setAdding(true)
    setError('')

    try {
      const productId = await resolveId()
      if (!productId) {
        setError(t('cart.addFailed'))
        return
      }

      if (!customer) {
        setPendingAdd({ productId, returnTo: location.pathname })
        navigate('/login', { state: { from: location.pathname, reason: 'addToCart' } })
        return
      }

      await addToApi(productId)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cart.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className="card-luxury group">
      <div className="relative aspect-square overflow-hidden bg-marea-bg-soft">
        {badge && (
          <span className="absolute start-4 top-4 z-10 rounded-full bg-marea-gold/90 px-3 py-1 text-xs font-medium tracking-wide text-marea-bg uppercase">
            {badge}
          </span>
        )}
        {product.stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 z-10 bg-marea-bg/80 py-2 text-center text-xs font-semibold uppercase tracking-wider text-red-400 backdrop-blur-sm">
            {t('cart.soldOut')}
          </span>
        )}
        <button
          type="button"
          onClick={handleLike}
          aria-label={liked ? t('likes.unlike') : t('likes.like')}
          className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-marea-border bg-marea-bg/70 text-marea-cream backdrop-blur-sm transition-colors hover:border-marea-gold hover:text-marea-gold"
        >
          <Heart
            size={18}
            className={`transition-transform duration-200 ${liked ? 'fill-marea-gold text-marea-gold' : ''} ${heartPop ? 'like-heart-pop' : ''}`}
          />
        </button>
        <Link to={detailPath} className="block h-full w-full">
          <img
            src={product.image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      </div>
      <div className="p-5">
        <Link to={detailPath}>
          <h3 className="font-serif text-xl font-medium text-marea-cream transition-colors hover:text-marea-gold">
            {name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-marea-muted">{description}</p>
        <div className="mt-2">
          <StockBadge stock={product.stock} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="price-en font-medium text-marea-gold">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="price-en text-sm text-marea-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <div className="price-en flex items-center gap-1 text-sm text-marea-muted">
            <Star size={14} className="fill-marea-gold text-marea-gold" />
            {product.rating}
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={product.stock <= 0 || adding}
          className="btn-secondary mt-4 w-full text-sm disabled:opacity-40"
        >
          <ShoppingBag size={14} className="inline me-2" />
          {product.stock <= 0
            ? t('cart.soldOut')
            : adding
              ? t('common.loading')
              : t('cart.addToCart')}
        </button>
      </div>
    </article>
  )
}
