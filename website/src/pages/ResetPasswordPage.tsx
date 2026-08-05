import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../services/api'

const cleanEmail = (value: string) =>
  value.replace(/[\s\u200e\u200f\u202a-\u202e]/g, '').replace(/＠/g, '@')

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const stateEmail = (location.state as { email?: string; codeSent?: boolean } | null)?.email || ''

  const [email, setEmail] = useState(stateEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [info, setInfo] = useState(
    (location.state as { codeSent?: boolean } | null)?.codeSent ? t('auth.resetCodeSent') : '',
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.resetPassword({ email: cleanEmail(email), token: code, password })
      navigate('/login', { state: { resetSuccess: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setError('')
    setInfo('')
    try {
      await api.forgotPassword(cleanEmail(email))
      setInfo(t('auth.resetCodeSent'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotFailed'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-24">
      <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-marea-border bg-marea-bg-card p-8">
        <h1 className="font-serif text-2xl">{t('auth.resetTitle')}</h1>
        <p className="mt-3 text-sm text-marea-muted">{t('auth.resetSubtitle')}</p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {info && (
          <div className="mt-4 space-y-1">
            <p className="text-sm text-marea-gold">{info}</p>
            <p className="text-xs text-marea-muted">{t('auth.resetCodeSpam')}</p>
          </div>
        )}

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
          {t('auth.resetCode')}
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="123456"
            className="price-en mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:border-marea-gold"
          />
        </label>

        <label className="mt-4 block text-sm text-marea-muted">
          {t('auth.newPassword')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 outline-none focus:border-marea-gold"
          />
        </label>

        <label className="mt-4 block text-sm text-marea-muted">
          {t('auth.confirmPassword')}
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 outline-none focus:border-marea-gold"
          />
        </label>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="btn-primary mt-6 w-full disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('auth.resetBtn')}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="btn-secondary mt-3 w-full text-sm disabled:opacity-50"
        >
          {resending ? t('common.loading') : t('auth.resendResetCode')}
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
