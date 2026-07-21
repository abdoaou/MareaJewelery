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
    setLoading(true)
    setError('')
    try {
      const res = await api.checkout({
        items: cartItems,
        ...form,
        payment_method: 'cod',
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
        <p className="mt-3 text-sm text-marea-muted">{t('checkout.deliveryNote')}</p>
      </div>

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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('common.loading') : t('checkout.placeOrder')}
        </button>
      </form>
    </div>
  )
}
