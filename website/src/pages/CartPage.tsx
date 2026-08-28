import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/formatPrice'
import LoadingAnimation from '../components/LoadingAnimation'
import LoadError from '../components/LoadError'
import { getErrorMessage } from '../utils/errorMessage'

export default function CartPage() {
  const { t } = useTranslation()
  const { customer } = useAuth()
  const { apiItems, updateApiQty, removeApiItem, syncFromApi } = useCartStore()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    syncFromApi()
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, t('cart.loadFailed')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [syncFromApi, t])

  const items = apiItems.map((i) => ({
    id: i.id,
    productId: i.product_id,
    name: i.name,
    price: Number(i.sale_price ?? i.price),
    quantity: i.quantity,
    stock: i.stock,
    image: i.image,
  }))

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  const run = async (itemId: string, action: () => Promise<void>) => {
    setError('')
    setBusyId(itemId)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cart.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <LoadingAnimation className="py-24" />
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="font-serif text-3xl">{t('cart.title')}</h1>
        <LoadError message={loadError} onRetry={() => {
          setLoading(true)
          setLoadError('')
          void syncFromApi().finally(() => setLoading(false))
        }} />
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl">{t('cart.title')}</h1>
        <p className="mt-4 text-marea-muted">{t('cart.empty')}</p>
        <Link to="/" className="btn-primary mt-8 inline-flex">
          {t('hero.shopCollection')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-serif text-3xl">{t('cart.title')}</h1>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <div className="mt-8 space-y-4">
        {items.map((item) => {
          const busy = busyId === item.id
          const atMin = item.quantity <= 1
          const atMax = item.stock > 0 && item.quantity >= item.stock

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-marea-border bg-marea-bg-card p-4"
            >
              {item.image && (
                <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-marea-gold price-en">{formatPrice(item.price)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t('cart.decrease')}
                  disabled={busy || atMin}
                  onClick={() => run(item.id, () => updateApiQty(item.id, item.quantity - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-marea-border text-marea-cream transition hover:border-marea-gold hover:text-marea-gold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="price-en w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                <button
                  type="button"
                  aria-label={t('cart.increase')}
                  disabled={busy || atMax}
                  onClick={() => run(item.id, () => updateApiQty(item.id, item.quantity + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-marea-border text-marea-cream transition hover:border-marea-gold hover:text-marea-gold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="price-en w-24 text-end text-sm text-marea-muted">
                {formatPrice(item.price * item.quantity)}
              </p>

              <button
                type="button"
                aria-label={t('cart.remove')}
                disabled={busy}
                onClick={() => run(item.id, () => removeApiItem(item.id))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-marea-border text-marea-muted transition hover:border-red-400/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-marea-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-lg">
          {t('cart.total')}: <span className="price-en">{formatPrice(total)}</span>
        </span>
        {customer ? (
          <Link to="/checkout" className="btn-primary text-center">
            {t('cart.checkout')}
          </Link>
        ) : (
          <Link
            to="/login"
            state={{ from: '/checkout', reason: 'checkout' }}
            className="btn-primary text-center"
          >
            {t('nav.login')}
          </Link>
        )}
      </div>
    </div>
  )
}
