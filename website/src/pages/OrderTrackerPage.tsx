import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, ChevronRight } from 'lucide-react'
import { api, type Order } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/formatPrice'
import { statusBadgeClass } from '../utils/orderStatus'
import LoadingAnimation from '../components/LoadingAnimation'
import OrderPriceSummary from '../components/OrderPriceSummary'

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${statusBadgeClass(status)}`}
    >
      {t(`orderTracker.status.${status}`, status)}
    </span>
  )
}

function OrderItemsList({ order }: { order: Order }) {
  const { t } = useTranslation()

  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-serif text-xl">{t('orderTracker.items')}</h2>
      {order.items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-xl border border-marea-border bg-marea-bg-card p-4"
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-marea-bg-soft">
              <Package size={24} className="text-marea-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-marea-cream">{item.name}</p>
            <p className="text-sm text-marea-muted">
              {t('orderTracker.qty')}: {item.quantity}
            </p>
            <p className="price-en mt-1 text-sm text-marea-gold">{formatPrice(item.lineTotal)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      ))}
    </div>
  )
}

function OrderDetail({ orderId }: { orderId: string }) {
  const { t } = useTranslation()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await api.getOrder(orderId)
      setOrder(res.data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orderTracker.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [orderId, t])

  useEffect(() => {
    load()
    let interval = window.setInterval(load, 30000)

    const onVisibility = () => {
      window.clearInterval(interval)
      if (!document.hidden) {
        load()
        interval = window.setInterval(load, 30000)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  if (loading) {
    return <LoadingAnimation className="py-24" />
  }

  if (error || !order) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-400">{error || t('orderTracker.notFound')}</p>
        <Link to="/order-tracker" className="btn-secondary mt-6 inline-flex">
          {t('orderTracker.viewAll')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-xl border border-marea-gold/30 bg-marea-gold/10 p-6">
        <p className="text-sm text-marea-muted">{t('orderTracker.orderNumber')}</p>
        <p className="price-en mt-1 font-serif text-2xl text-marea-cream">{order.orderNumber}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-sm text-marea-muted">
            {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>
        <p className="price-en mt-4 text-lg text-marea-gold">
          {t('orderTracker.total')}: {formatPrice(order.total)}
        </p>
      </div>

      <OrderPriceSummary order={order} />

      {order.statusHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-xl">{t('orderTracker.timeline')}</h2>
          <ol className="mt-4 space-y-3 border-s border-marea-border ps-6">
            {order.statusHistory.map((step, i) => (
              <li key={`${step.status}-${i}`} className="relative">
                <span className="absolute -start-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-marea-gold" />
                <p className="font-medium text-marea-cream">
                  {t(`orderTracker.status.${step.status}`, step.status)}
                </p>
                {step.note && <p className="text-sm text-marea-muted">{step.note}</p>}
                <p className="text-xs text-marea-muted">
                  {new Date(step.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <OrderItemsList order={order} />

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/" className="btn-primary">
          {t('orderTracker.continueShopping')}
        </Link>
        <Link to="/order-tracker" className="btn-secondary">
          {t('orderTracker.viewAll')}
        </Link>
      </div>
    </div>
  )
}

function OrderList() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getOrders()
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LoadingAnimation className="py-24" />
  }

  if (!orders.length) {
    return (
      <div className="py-16 text-center">
        <Package size={48} className="mx-auto text-marea-muted" />
        <p className="mt-4 text-marea-muted">{t('orderTracker.empty')}</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          {t('hero.shopCollection')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          to={`/order-tracker/${order.id}`}
          className="flex items-center justify-between rounded-xl border border-marea-border bg-marea-bg-card p-5 transition-colors hover:border-marea-gold/40"
        >
          <div>
            <p className="price-en font-medium text-marea-cream">{order.orderNumber}</p>
            <p className="mt-1 text-sm text-marea-muted">
              {order.items.length} {t('orderTracker.itemsCount')} ·{' '}
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-2">
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <span className="price-en block text-marea-gold">{formatPrice(order.total)}</span>
              {order.promo && (
                <span className="mt-0.5 block text-xs text-marea-muted">{order.promo.benefit}</span>
              )}
            </div>
            <ChevronRight size={18} className="text-marea-muted" />
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function OrderTrackerPage() {
  const { t } = useTranslation()
  const { orderId } = useParams()
  const { customer } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!customer) navigate('/login', { state: { from: orderId ? `/order-tracker/${orderId}` : '/order-tracker' } })
  }, [customer, navigate, orderId])

  if (!customer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-marea-muted">{t('checkout.redirectingLogin')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-serif text-3xl">{t('orderTracker.title')}</h1>
      <p className="mt-2 text-marea-muted">
        {orderId ? t('orderTracker.subtitleDetail') : t('orderTracker.subtitle')}
      </p>
      <div className="mt-8">{orderId ? <OrderDetail orderId={orderId} /> : <OrderList />}</div>
    </div>
  )
}
