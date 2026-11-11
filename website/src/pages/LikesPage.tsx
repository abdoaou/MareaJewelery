import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, ShoppingBag } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWishlistStore } from '../store/wishlistStore'
import { useCartStore } from '../store/cartStore'
import { formatPrice } from '../utils/formatPrice'
import { getErrorMessage } from '../utils/errorMessage'
import LoadingAnimation from '../components/LoadingAnimation'
import LoadError from '../components/LoadError'

export default function LikesPage() {
  const { t } = useTranslation()
  const { customer } = useAuth()
  const navigate = useNavigate()
  const { items, sync, toggle, loaded } = useWishlistStore()
  const addToApi = useCartStore((s) => s.addToApi)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) {
      navigate('/login', { state: { from: '/likes', reason: 'like' } })
      return
    }
    setError('')
    sync().catch((err) => setError(getErrorMessage(err, t('likes.loadFailed'))))
  }, [customer, navigate, sync, reloadKey, t])

  if (!customer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-marea-muted">{t('checkout.redirectingLogin')}</p>
      </div>
    )
  }

  if (!loaded && !error) {
    return <LoadingAnimation className="py-24" />
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="font-serif text-3xl">{t('likes.title')}</h1>
        <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    )
  }

  async function handleAddToCart(productId: string) {
    if (addingId) return
    setAddingId(productId)
    try {
      await addToApi(productId)
    } catch {
      /* api toast */
    } finally {
      setAddingId(null)
    }
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Heart size={40} className="mx-auto text-marea-muted" />
        <h1 className="mt-4 font-serif text-3xl">{t('likes.title')}</h1>
        <p className="mt-4 text-marea-muted">{t('likes.empty')}</p>
        <Link to="/#best-sellers" className="btn-primary mt-8 inline-flex">
          {t('hero.shopCollection')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-serif text-3xl">{t('likes.title')}</h1>
      <p className="mt-2 text-marea-muted">{t('likes.subtitle', { count: items.length })}</p>

      <div className="mt-8 space-y-4">
        {items.map((item) => {
          const price = Number(item.product.salePrice ?? item.product.price)
          const detailPath = `/product/${item.product.slug}`
          const isAdding = addingId === item.productId

          return (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-marea-border bg-marea-bg-card p-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <Link
                to={detailPath}
                className="flex min-w-0 flex-1 items-center gap-4 transition hover:opacity-90"
              >
                {item.product.image ? (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-marea-bg-soft">
                    <Heart size={20} className="text-marea-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-marea-cream transition-colors hover:text-marea-gold">
                    {item.product.name}
                  </p>
                  <p className="price-en mt-1 text-marea-gold">{formatPrice(price)}</p>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => void handleAddToCart(item.productId)}
                  className="btn-secondary flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50 sm:flex-initial"
                >
                  <ShoppingBag size={16} />
                  {isAdding ? t('common.loading') : t('cart.addToCart')}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-marea-border p-2.5 text-marea-gold transition hover:border-marea-gold sm:self-center"
                  onClick={() => toggle(item.productId).catch(() => {})}
                  aria-label={t('likes.unlike')}
                >
                  <Heart size={18} className="fill-marea-gold" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
