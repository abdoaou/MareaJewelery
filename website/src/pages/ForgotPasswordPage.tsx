import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../services/api'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.forgotPassword(email)
      navigate('/reset-password', { state: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-24">
      <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-marea-border bg-marea-bg-card p-8">
        <h1 className="font-serif text-2xl">{t('auth.forgotTitle')}</h1>
        <p className="mt-3 text-sm text-marea-muted">{t('auth.forgotSubtitle')}</p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <label className="mt-6 block text-sm text-marea-muted">
          {t('auth.email')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 outline-none focus:border-marea-gold"
          />
        </label>

        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full disabled:opacity-50">
          {loading ? t('common.loading') : t('auth.sendResetCode')}
        </button>

        <p className="mt-4 text-center text-sm text-marea-muted">
          <Link to="/login" className="text-marea-gold">
            {t('nav.login')}
          </Link>
        </p>
      </form>
    </div>
  )
}
