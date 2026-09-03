import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../services/api'
import { useCartStore } from '../store/cartStore'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/formatPrice'

export default function CheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { customer } = useAuth()
  const { apiItems, clearApiCart } = useCartStore()

  useEffect(() => {
    if (!customer) navigate('/login', { state: { from: '/checkout' } })
  }, [customer, navigate])

  useEffect(() => {
    if (customer && !apiItems.length) navigate('/cart')
  }, [customer, apiItems.length, navigate])

  const cartItems = apiItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
  const subtotal = apiItems.reduce(
    (sum, i) => sum + Number(i.sale_price ?? i.price) * i.quantity,
    0,
  )
  const [form, setForm] = useState({
    customer_name: customer?.full_name || '',
    customer_email: customer?.email || '',
    customer_phone: customer?.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deliveryAcknowledged, setDeliveryAcknowledged] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
  } | null>(null)

  const shipping = 0
  const discount = appliedCoupon?.discount ?? 0
  const total = Math.max(0, subtotal - discount)

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setCouponLoading(true)
    setError('')
    try {
      const res = await api.validateCoupon(code, subtotal, shipping)
      setAppliedCoupon({ code: res.data.code, discount: res.data.discount })
    } catch (err) {
      setAppliedCoupon(null)
      setError(err instanceof Error ? err.message : t('checkout.failed'))
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
  }

  const setLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({
        ...f,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }))
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliveryAcknowledged) {
      setError(t('checkout.deliveryAcknowledgeRequired'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.checkout({
        items: cartItems,
        ...form,
        payment_method: 'cod',
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
      })
      await clearApiCart()
      navigate(`/order-tracker/${res.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.failed'))
    } finally {
      setLoading(false)
    }
  }

  if (!customer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-marea-muted">{t('checkout.redirectingLogin')}</p>
      </div>
    )
  }

  if (!cartItems.length) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-marea-muted">{t('checkout.redirectingCart')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-serif text-3xl">{t('checkout.title')}</h1>

      <div className="mt-4 rounded-xl border border-marea-gold/30 bg-marea-gold/10 p-4">
        <p className="font-medium text-marea-gold">{t('checkout.cod')}</p>
        <p className="text-sm text-marea-muted">{t('checkout.codNote')}</p>
      </div>

      <div className="mt-4 rounded-xl border border-marea-border bg-marea-bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-marea-muted">{t('checkout.subtotal')}</span>
          <span className="price-en font-medium text-marea-cream">{formatPrice(subtotal)}</span>
        </div>
        {appliedCoupon && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-marea-muted">{t('checkout.discount')}</span>
            <span className="price-en font-medium text-marea-gold">−{formatPrice(appliedCoupon.discount)}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-marea-border pt-2 text-sm">
          <span className="font-medium text-marea-cream">{t('orderTracker.total')}</span>
          <span className="price-en font-medium text-marea-cream">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-marea-border bg-marea-bg-card p-4">
        <p className="text-sm text-marea-muted">{t('checkout.coupon')}</p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder={t('checkout.couponPlaceholder')}
            disabled={Boolean(appliedCoupon)}
            className="flex-1 rounded-lg border border-marea-border bg-marea-bg px-4 py-2.5 text-sm text-marea-cream outline-none focus:border-marea-gold disabled:opacity-60"
          />
          {appliedCoupon ? (
            <button type="button" onClick={removeCoupon} className="btn-secondary shrink-0 px-4 text-sm">
              {t('checkout.removeCoupon')}
            </button>
          ) : (
            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="btn-secondary shrink-0 px-4 text-sm disabled:opacity-50"
            >
              {couponLoading ? t('common.loading') : t('checkout.applyCoupon')}
            </button>
          )}
        </div>
        {appliedCoupon && (
          <p className="mt-2 text-xs text-marea-gold">{t('checkout.couponApplied')}: {appliedCoupon.code}</p>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-marea-border bg-marea-bg-card p-4">
        <input
          type="checkbox"
          checked={deliveryAcknowledged}
          onChange={(e) => {
            setDeliveryAcknowledged(e.target.checked)
            if (e.target.checked) setError('')
          }}
          className="mt-1 h-4 w-4 shrink-0 accent-marea-gold"
        />
        <span className="text-sm text-marea-cream">{t('checkout.deliveryAcknowledge')}</span>
      </label>

      {error && <p className="mt-4 text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {(
          [
            ['customer_name', t('checkout.fullName')],
            ['customer_email', t('checkout.email'), 'email'],
            ['customer_phone', t('checkout.phone'), 'tel'],
            ['address_line1', t('checkout.address')],
            ['address_line2', t('checkout.address2')],
            ['city', t('checkout.city')],
            ['state', t('checkout.state')],
            ['postal_code', t('checkout.postal')],
            ['country', t('checkout.country')],
          ] as const
        ).map(([key, label, type = 'text']) => (
          <label key={key} className="block text-sm text-marea-muted">
            {label}
            <input
              type={type}
              required={!['address_line2', 'state', 'postal_code'].includes(key)}
              value={form[key as keyof typeof form] as string}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg-card px-4 py-3 text-marea-cream outline-none focus:border-marea-gold"
            />
          </label>
        ))}

        <div>
          <p className="text-sm text-marea-muted">{t('checkout.location')}</p>
          <button type="button" onClick={setLocation} className="btn-secondary mt-2 text-sm">
            {t('checkout.locationHint')}
            {form.latitude && ` ✓ (${form.latitude.toFixed(4)}, ${form.longitude?.toFixed(4)})`}
          </button>
        </div>

        <button type="submit" disabled={loading || !deliveryAcknowledged} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? t('common.loading') : t('checkout.placeOrder')}
        </button>
      </form>
    </div>
  )
}
