import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCartStore } from '../store/cartStore'
import { processPendingAdd } from '../utils/pendingCart'
import { processPendingLike } from '../utils/pendingLike'
import { useWishlistStore } from '../store/wishlistStore'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { completeAuth } = useAuth()
  const addToApi = useCartStore((s) => s.addToApi)
  const toggleLike = useWishlistStore((s) => s.toggle)
  const autoResendDone = useRef(false)

  const state = location.state as {
    email?: string
    from?: string
    reason?: string
    emailSent?: boolean
  } | null
  const [email, setEmail] = useState(state?.email || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState(
    state?.email && state.emailSent !== false ? t('auth.codeSent') : '',
  )
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const from = state?.from || '/'

  // If register could not deliver the first email, resend once on arrival
  useEffect(() => {
    if (!state?.email || state.emailSent !== false || autoResendDone.current) return
    autoResendDone.current = true
    let cancelled = false
    ;(async () => {
      setResending(true)
      try {
        await api.resendVerification(state.email!)
        if (!cancelled) setInfo(t('auth.codeResent'))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('auth.verifyFailed'))
        }
      } finally {
        if (!cancelled) setResending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state?.email, state?.emailSent, t])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.verifyEmail({ email, code })
      completeAuth(res.data)
      const afterLike = await processPendingLike(toggleLike)
      if (afterLike) {
        navigate(afterLike)
        return
      }
      const afterAdd = await processPendingAdd(addToApi)
      navigate(afterAdd || from)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.verifyFailed'))
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
      await api.resendVerification(email)
      setInfo(t('auth.codeResent'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.verifyFailed'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-24">
      <form onSubmit={handleVerify} className="w-full rounded-2xl border border-marea-border bg-marea-bg-card p-8">
        <h1 className="font-serif text-2xl">{t('auth.verifyTitle')}</h1>
        <p className="mt-3 text-sm text-marea-muted">{t('auth.verifySubtitle')}</p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {info && <p className="mt-4 text-sm text-marea-gold">{info}</p>}

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

        <label className="mt-4 block text-sm text-marea-muted">
          {t('auth.verificationCode')}
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

        <button type="submit" disabled={loading || code.length !== 6} className="btn-primary mt-6 w-full disabled:opacity-50">
          {loading ? t('common.loading') : t('auth.verifyBtn')}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="btn-secondary mt-3 w-full text-sm disabled:opacity-50"
        >
          {resending ? t('common.loading') : t('auth.resendCode')}
        </button>

        <p className="mt-4 text-center text-sm text-marea-muted">
          <Link to="/login" state={{ from }} className="text-marea-gold">
            {t('nav.login')}
          </Link>
        </p>
      </form>
    </div>
  )
}
