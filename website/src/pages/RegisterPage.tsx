import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useCartStore } from '../store/cartStore'
import { processPendingAdd } from '../utils/pendingCart'

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const addToApi = useCartStore((s) => s.addToApi)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' })
  const [error, setError] = useState('')

  const reason = (location.state as { reason?: string } | null)?.reason
  const from = (location.state as { from?: string } | null)?.from || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await register(form)
      if (result.requiresVerification) {
        navigate('/verify-email', {
          state: {
            email: result.email || form.email,
            from,
            reason,
            emailSent: result.emailSent !== false,
          },
        })
        return
      }
      const afterAdd = await processPendingAdd(addToApi)
      navigate(afterAdd || from)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registrationFailed'))
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-24">
      <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-marea-border bg-marea-bg-card p-8">
        <h1 className="font-serif text-2xl">{t('auth.registerTitle')}</h1>
        {reason === 'addToCart' && (
          <p className="mt-4 rounded-lg border border-marea-gold/30 bg-marea-gold/10 px-4 py-3 text-sm text-marea-muted">
            {t('cart.loginToAdd')}
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {(['fullName', 'email', 'phone', 'password'] as const).map((key) => (
          <label key={key} className="mt-4 block text-sm text-marea-muted">
            {t(`auth.${key === 'fullName' ? 'fullName' : key}`)}
            <input
              type={key === 'email' ? 'email' : key === 'password' ? 'password' : 'text'}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={key !== 'phone'}
              className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 outline-none focus:border-marea-gold"
            />
          </label>
        ))}
        <button type="submit" className="btn-primary mt-6 w-full">
          {t('auth.registerBtn')}
        </button>
        <p className="mt-4 text-center text-sm text-marea-muted">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" state={{ from, reason }} className="text-marea-gold">
            {t('nav.login')}
          </Link>
        </p>
      </form>
    </div>
  )
}
