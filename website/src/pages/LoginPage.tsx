import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useCartStore } from '../store/cartStore'
import { processPendingAdd } from '../utils/pendingCart'
import { processPendingLike } from '../utils/pendingLike'
import { useWishlistStore } from '../store/wishlistStore'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const addToApi = useCartStore((s) => s.addToApi)
  const toggleLike = useWishlistStore((s) => s.toggle)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Strip spaces, invisible RTL marks, and full-width @ that mobile keyboards insert
  const cleanEmail = (value: string) =>
    value.replace(/[\s\u200e\u200f\u202a-\u202e]/g, '').replace(/＠/g, '@')

  const reason = (location.state as { reason?: string } | null)?.reason
  const from = (location.state as { from?: string } | null)?.from || '/'
  const resetSuccess = (location.state as { resetSuccess?: boolean } | null)?.resetSuccess

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      const afterLike = await processPendingLike(toggleLike)
      if (afterLike) {
        navigate(afterLike)
        return
      }
      const afterAdd = await processPendingAdd(addToApi)
      navigate(afterAdd || from)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.loginFailed')
      setError(message)
      if (message.toLowerCase().includes('verify') && email) {
        navigate('/verify-email', { state: { email, from, reason } })
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-24">
      <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-marea-border bg-marea-bg-card p-8">
        <h1 className="font-serif text-2xl">{t('auth.loginTitle')}</h1>
        {reason === 'checkout' && (
          <p className="mt-4 rounded-lg border border-marea-gold/30 bg-marea-gold/10 px-4 py-3 text-sm text-marea-muted">
            {t('cart.loginRequired')}
          </p>
        )}
        {reason === 'addToCart' && (
          <p className="mt-4 rounded-lg border border-marea-gold/30 bg-marea-gold/10 px-4 py-3 text-sm text-marea-muted">
            {t('cart.loginToAdd')}
          </p>
        )}
        {reason === 'like' && (
          <p className="mt-4 rounded-lg border border-marea-gold/30 bg-marea-gold/10 px-4 py-3 text-sm text-marea-muted">
            {t('likes.loginRequired')}
          </p>
        )}
        {resetSuccess && (
          <p className="mt-4 rounded-lg border border-marea-gold/30 bg-marea-gold/10 px-4 py-3 text-sm text-marea-gold">
            {t('auth.resetSuccess')}
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        <label className="mt-6 block text-sm text-marea-muted">
          {t('auth.email')}
          <input
            type="email"
            dir="ltr"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(cleanEmail(e.target.value))}
            required
            className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 outline-none focus:border-marea-gold"
          />
        </label>
        <label className="mt-4 block text-sm text-marea-muted">
          {t('auth.password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 outline-none focus:border-marea-gold"
          />
        </label>
        <div className="mt-2 text-end">
          <Link to="/forgot-password" className="text-sm text-marea-gold hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </div>
        <button type="submit" className="btn-primary mt-6 w-full">
          {t('auth.loginBtn')}
        </button>
        <p className="mt-4 text-center text-sm text-marea-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/register" state={{ from, reason }} className="text-marea-gold">
            {t('nav.register')}
          </Link>
        </p>
      </form>
    </div>
  )
}
