import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check, Gift, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api, type WheelPrize, type WheelSpinResult, type WheelStatus } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useLuckyWheel } from './LuckyWheelProvider'
import WheelCanvas from './WheelCanvas'
import {
  WHEEL_SPIN_MS,
  animateWheelRotation,
  computeWheelTargetRotation,
  prefersReducedMotion,
  randomLandingOffset,
} from './wheelSpinAnimation'

const POPUP_KEY = 'marea_wheel_popup_seen'
const PENDING_SPIN_KEY = 'marea_wheel_pending_spin_id'

export { POPUP_KEY, PENDING_SPIN_KEY }

interface LuckyWheelModalProps {
  open: boolean
  onClose: () => void
}

function SparkleBurst({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="wheel-win-burst pointer-events-none absolute left-1/2 top-[42%] z-40 -translate-x-1/2" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className="wheel-win-burst__ray" style={{ '--burst-i': i } as CSSProperties} />
      ))}
    </div>
  )
}

function prizeHeadline(prize: WheelSpinResult['prize']) {
  if (!prize) return ''
  if (prize.type === 'discount' && prize.value) return `${prize.value}% OFF`
  return prize.name
}

function prizeSubline(prize: WheelSpinResult['prize']) {
  if (!prize) return ''
  if (prize.type === 'discount') return prize.name
  if (prize.type === 'free_shipping') return 'Applied at checkout'
  if (prize.type === 'free_gift') return 'Special gift with your order'
  return ''
}

interface ResultPanelProps {
  result: WheelSpinResult
  customer: ReturnType<typeof useAuth>['customer']
  copied: boolean
  onCopy: () => void
  onClose: () => void
}

function ResultPanel({ result, customer, copied, onCopy, onClose }: ResultPanelProps) {
  const { t } = useTranslation()
  const needsLogin = result.requiresLogin && !customer
  const showCoupon = result.couponCode && !needsLogin

  if (!result.isWinner) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="wheel-result-card text-center"
        role="status"
      >
        <p className="font-serif text-xl text-[var(--wheel-ink)]">{t('wheel.noLuck')}</p>
        <p className="mt-2 font-[family-name:var(--font-wheel-ui)] text-sm text-[var(--wheel-ink-muted)]">
          {t('wheel.tryAgainHint')}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="wheel-result-stack space-y-3 sm:space-y-4"
      role="status"
    >
      <div className="wheel-result-card relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(212,185,122,0.16)] to-transparent" />
        <div className="relative px-3 py-4 sm:px-5 sm:py-5">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(184,146,74,0.45)] bg-[rgba(212,185,122,0.15)]">
            <Gift className="text-[#8C6B2E]" size={18} />
          </div>
          <p className="wheel-eyebrow">{t('wheel.youWon')}</p>
          <p className="mt-1 font-serif text-2xl tracking-wide text-[var(--wheel-ink)] sm:text-[2rem]">
            {prizeHeadline(result.prize)}
          </p>
          {prizeSubline(result.prize) && (
            <p className="mt-1 font-[family-name:var(--font-wheel-ui)] text-sm text-[var(--wheel-ink-muted)]">
              {prizeSubline(result.prize)}
            </p>
          )}
        </div>
      </div>

      {needsLogin ? (
        <div className="wheel-claim-card text-center">
          <Sparkles className="mx-auto mb-2 text-[#8C6B2E]" size={18} />
          <p className="font-serif text-lg text-[var(--wheel-ink)]">{t('wheel.claimTitle')}</p>
          <p className="mt-1.5 font-[family-name:var(--font-wheel-ui)] text-sm leading-relaxed text-[var(--wheel-ink-muted)]">
            {t('wheel.claimPrompt')}
          </p>
          <aside className="mt-4 space-y-2.5" aria-label={t('wheel.claimTitle')}>
            <Link to="/register" className="wheel-claim-btn w-full" onClick={onClose}>
              {t('nav.register')}
            </Link>
            <Link to="/login" className="wheel-claim-btn wheel-claim-btn--ghost w-full" onClick={onClose}>
              {t('nav.login')}
            </Link>
          </aside>
        </div>
      ) : (
        <div className="wheel-claim-card text-center">
          <p className="font-[family-name:var(--font-wheel-ui)] text-sm text-[var(--wheel-ink-muted)]">
            {result.alreadyUsed ? t('wheel.alreadyUsed') : t('wheel.saved')}
          </p>
          {showCoupon && (
            <div className="mt-3">
              <p className="wheel-eyebrow mb-2">{t('wheel.yourCode')}</p>
              <div className="flex max-w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
                <code className="wheel-coupon-code rounded-lg border border-[rgba(184,146,74,0.45)] bg-[rgba(255,255,255,0.72)] px-3 py-2.5 font-mono text-xs tracking-wider text-[var(--wheel-ink)] sm:px-4 sm:text-sm">
                  {result.couponCode}
                </code>
                <button
                  type="button"
                  onClick={onCopy}
                  className="wheel-claim-btn wheel-claim-btn--ghost shrink-0 px-4 py-2.5"
                  aria-label="Copy code"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-2 font-[family-name:var(--font-wheel-ui)] text-xs text-[var(--wheel-ink-muted)]">
                {t('wheel.codeHint')}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function LuckyWheelModal({ open, onClose }: LuckyWheelModalProps) {
  const { t } = useTranslation()
  const { customer } = useAuth()
  const { prizes: cachedPrizes, wheelReady, applyStatus } = useLuckyWheel()
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [loading, setLoading] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [preSpinning, setPreSpinning] = useState(false)
  const [error, setError] = useState('')
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelSpinResult | null>(null)
  const [alreadySpun, setAlreadySpun] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showBurst, setShowBurst] = useState(false)
  const rotationBase = useRef(0)
  const cancelSpin = useRef<(() => void) | null>(null)
  const preSpinTimer = useRef<number | null>(null)
  const pendingResult = useRef<WheelSpinResult | null>(null)

  const syncStatus = useCallback((status: WheelStatus) => {
    applyStatus(status)
    if (status.alreadySpun && status.result) {
      setAlreadySpun(true)
      setResult(status.result)
    } else {
      setAlreadySpun(false)
      setResult(null)
    }
  }, [applyStatus])

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (!opts?.background) setLoading(true)
    setError('')
    try {
      const [prizesRes, statusRes] = await Promise.all([
        api.getWheelPrizes({ silent: true }),
        api.getWheelStatus({ silent: true }),
      ])
      setPrizes(prizesRes.data)
      syncStatus(statusRes.data)
    } catch (err) {
      if (!opts?.background) {
        setError(err instanceof Error ? err.message : t('wheel.loadFailed'))
      }
    } finally {
      setLoading(false)
    }
  }, [syncStatus, t])

  useEffect(() => {
    if (!open) return

    if (cachedPrizes.length > 0) {
      setPrizes(cachedPrizes)
      setLoading(false)
      void api.getWheelStatus({ silent: true }).then((res) => syncStatus(res.data)).catch(() => {})
    } else if (!wheelReady) {
      void load()
    } else {
      setPrizes(cachedPrizes)
      setLoading(false)
    }

    return () => {
      cancelSpin.current?.()
      if (preSpinTimer.current) window.clearInterval(preSpinTimer.current)
    }
  }, [open, cachedPrizes, wheelReady, load, syncStatus])

  const stopPreSpin = useCallback(() => {
    if (preSpinTimer.current) {
      window.clearInterval(preSpinTimer.current)
      preSpinTimer.current = null
    }
    setPreSpinning(false)
  }, [])

  const startPreSpin = useCallback(() => {
    setPreSpinning(true)
    preSpinTimer.current = window.setInterval(() => {
      rotationBase.current += 22
      setRotation(rotationBase.current)
    }, 40)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !spinning && !preSpinning) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, spinning, preSpinning])

  useEffect(() => {
    if (result?.isWinner && !spinning) {
      setShowBurst(true)
      const timer = window.setTimeout(() => setShowBurst(false), 1400)
      return () => window.clearTimeout(timer)
    }
    setShowBurst(false)
  }, [result, spinning])

  async function handleSpin() {
    if (spinning || preSpinning || alreadySpun || !prizes.length) return
    setError('')
    setResult(null)
    startPreSpin()

    try {
      const res = await api.spinWheel()
      const spinResult = res.data

      stopPreSpin()

      if (spinResult.alreadyUsed) {
        setAlreadySpun(true)
        setResult(spinResult)
        return
      }

      localStorage.setItem(PENDING_SPIN_KEY, spinResult.spinId)
      pendingResult.current = spinResult

      const from = rotationBase.current
      const offset = randomLandingOffset(prizes.length)
      const target = computeWheelTargetRotation(from, spinResult.segmentIndex, prizes.length, undefined, offset)

      rotationBase.current = target
      setSpinning(true)

      cancelSpin.current?.()
      cancelSpin.current = animateWheelRotation(
        from,
        target,
        WHEEL_SPIN_MS,
        (deg) => setRotation(deg),
        () => {
          setSpinning(false)
          const finalResult = pendingResult.current
          if (finalResult) {
            setResult(finalResult)
            setAlreadySpun(true)
            if (customer && !finalResult.requiresLogin) {
              localStorage.removeItem(PENDING_SPIN_KEY)
            }
          }
        },
        prefersReducedMotion(),
      )
    } catch (err) {
      stopPreSpin()
      cancelSpin.current?.()
      setSpinning(false)
      setError(err instanceof Error ? err.message : t('wheel.spinFailed'))
    }
  }

  function copyCode() {
    if (!result?.couponCode) return
    void navigator.clipboard.writeText(result.couponCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const canSpin = !loading && !alreadySpun && prizes.length > 0 && !spinning && !preSpinning
  const highlightIndex = result && !spinning && !preSpinning ? result.segmentIndex : null
  const wheelBusy = spinning || preSpinning
  const showResult = result && !spinning && !preSpinning

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="wheel-overlay fixed inset-0 z-[70] flex"
          onClick={!wheelBusy ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lucky-wheel-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className={`wheel-modal-shell relative w-full${showResult ? ' wheel-modal-shell--with-result' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <SparkleBurst active={showBurst && !prefersReducedMotion()} />

            <div className="wheel-sheet-handle sm:hidden" aria-hidden />

            <button
              type="button"
              onClick={onClose}
              disabled={wheelBusy}
              className="wheel-close-btn absolute end-3 top-3 z-20 rounded-full p-2.5 transition disabled:opacity-40"
              aria-label={t('wheel.close')}
            >
              <X size={18} />
            </button>

            <header className="wheel-modal-header px-4 pb-4 pt-3 text-center sm:px-8 sm:pt-5">
              <p className="wheel-eyebrow">{t('wheel.label')}</p>
              <h2 id="lucky-wheel-title" className="wheel-title font-serif text-[var(--wheel-ink)]">
                {t('wheel.title')}
              </h2>
              <p className="wheel-subtitle mx-auto mt-2 max-w-md font-serif italic text-[var(--wheel-ink-muted)]">
                {t('wheel.subtitle')}
              </p>
            </header>

            <div className="wheel-modal-body wheel-modal-panel relative px-4 pb-5 pt-2 sm:px-8">
              {loading && !prizes.length ? (
                <p className="py-12 text-center font-[family-name:var(--font-wheel-ui)] text-sm text-[var(--wheel-ink-muted)]">
                  {t('common.loading')}
                </p>
              ) : prizes.length === 0 ? (
                <p className="py-12 text-center font-[family-name:var(--font-wheel-ui)] text-sm text-[var(--wheel-ink-muted)]">
                  {t('wheel.unavailable')}
                </p>
              ) : (
                <div className="wheel-layout">
                  <div className="wheel-column-wheel">
                    <div className="wheel-stage-wrap relative">
                      <WheelCanvas
                        prizes={prizes}
                        rotation={rotation}
                        spinning={spinning}
                        preSpinning={preSpinning}
                        highlightIndex={highlightIndex}
                      />
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => void handleSpin()}
                        disabled={!canSpin}
                        className="wheel-spin-pill"
                        aria-label={t('wheel.spin')}
                      >
                        {wheelBusy ? t('wheel.spinning') : 'Spin'}
                      </button>
                    </div>

                    {error && (
                      <p className="mt-3 text-center font-[family-name:var(--font-wheel-ui)] text-sm text-red-800/90" role="alert">
                        {error}
                      </p>
                    )}
                  </div>

                  <div
                    className="wheel-side-panel"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {showResult && (
                      <ResultPanel
                        result={result}
                        customer={customer}
                        copied={copied}
                        onCopy={copyCode}
                        onClose={onClose}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
