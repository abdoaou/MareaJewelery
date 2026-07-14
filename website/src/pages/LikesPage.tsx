import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWishlistStore } from '../store/wishlistStore'
import { formatPrice } from '../utils/formatPrice'
import LoadingAnimation from '../components/LoadingAnimation'

export default function LikesPage() {
  const { t } = useTranslation()
  const { customer } = useAuth()
  const navigate = useNavigate()
  const { items, sync, toggle, loaded } = useWishlistStore()

  useEffect(() => {
    if (!customer) {
      navigate('/login', { state: { from: '/likes', reason: 'like' } })
      return
    }
    sync()
  }, [customer, navigate, sync])

  if (!customer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-marea-muted">{t('checkout.redirectingLogin')}</p>
      </div>
    )
  }

  if (!loaded) {
    return <LoadingAnimation className="py-24" />
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
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-xl border border-marea-border bg-marea-bg-card p-4"
            >
              {item.product.image ? (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-marea-bg-soft">
                  <Heart size={20} className="text-marea-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-marea-cream">{item.product.name}</p>
                <p className="price-en mt-1 text-marea-gold">{formatPrice(price)}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-marea-border p-2 text-marea-gold hover:border-marea-gold"
                onClick={() => toggle(item.productId)}
                aria-label={t('likes.unlike')}
              >
                <Heart size={18} className="fill-marea-gold" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
