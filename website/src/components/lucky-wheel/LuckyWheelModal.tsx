import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check, Gift, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api, type WheelPrize, type WheelSpinResult, type WheelStatus } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useLuckyWheel } from './LuckyWheelProvider'
import WheelCanvas, { WHEEL_SPIN_MS, computeWheelTargetRotation } from './WheelCanvas'

const POPUP_KEY = 'marea_wheel_popup_seen'
const PENDING_SPIN_KEY = 'marea_wheel_pending_spin_id'

export { POPUP_KEY, PENDING_SPIN_KEY }

interface LuckyWheelModalProps {
  open: boolean
  onClose: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          className={`wheel-confetti-piece${i % 3 === 0 ? ' wheel-confetti-piece--star' : ''}`}
          initial={{ opacity: 0, left: '50%', top: '38%', scale: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            left: `${12 + (i * 2.7) % 76}%`,
            top: `${8 + (i * 3.1) % 55}%`,
            scale: [0, 1.1, 0.85, 0.4],
            rotate: [0, 120 + i * 18, 240 + i * 12],
          }}
          transition={{ duration: 1.6, delay: i * 0.028, ease: [0.22, 1, 0.36, 1] }}
        />
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="wheel-result-card mt-4 text-center sm:mt-5"
      >
        <p className="font-serif text-xl text-[var(--wheel-ink)]">{t('wheel.noLuck')}</p>
        <p className="mt-2 text-sm text-[var(--wheel-ink-muted)]">{t('wheel.noLuckHint')}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="wheel-result-stack mt-4 space-y-3 sm:mt-5 sm:space-y-4"
    >
      {/* Step 1: Prize reveal */}
      <div className="wheel-result-card relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(212,185,122,0.14)] to-transparent" />
        <div className="relative px-3 py-4 sm:px-5 sm:py-5">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(201,169,98,0.45)] bg-[rgba(212,185,122,0.18)] sm:mb-3 sm:h-11 sm:w-11">
            <Gift className="text-[#9a7b3c]" size={18} />
          </div>
          <p className="wheel-eyebrow">{t('wheel.youWon')}</p>
          <p className="mt-1 font-serif text-2xl tracking-wide text-[var(--wheel-ink)] sm:text-3xl md:text-[2rem]">
            {prizeHeadline(result.prize)}
          </p>
          {prizeSubline(result.prize) && (
            <p className="mt-1 text-sm text-[var(--wheel-ink-muted)]">{prizeSubline(result.prize)}</p>
          )}
        </div>
      </div>

      {/* Step 2: Claim or coupon */}
      {needsLogin ? (
        <div className="wheel-claim-card text-center">
          <Sparkles className="mx-auto mb-2 text-[#9a7b3c]" size={18} />
          <p className="font-medium text-[var(--wheel-ink)]">{t('wheel.claimTitle')}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--wheel-ink-muted)]">{t('wheel.claimPrompt')}</p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
            <Link to="/login" className="btn-primary w-full px-5 py-2.5 text-sm sm:min-w-[120px] sm:w-auto" onClick={onClose}>
              {t('nav.login')}
            </Link>
            <Link to="/register" className="btn-secondary w-full px-5 py-2.5 text-sm sm:min-w-[120px] sm:w-auto" onClick={onClose}>
              {t('nav.register')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="wheel-claim-card text-center">
          <p className="text-sm text-[var(--wheel-ink-muted)]">
            {result.alreadyUsed ? t('wheel.alreadyUsed') : t('wheel.saved')}
          </p>
          {showCoupon && (
            <div className="mt-3">
              <p className="wheel-eyebrow mb-2">{t('wheel.yourCode')}</p>
              <div className="mt-3 flex max-w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
                <code className="wheel-coupon-code rounded-lg border border-[rgba(201,169,98,0.5)] bg-[rgba(255,255,255,0.65)] px-3 py-2.5 font-mono text-xs tracking-wider text-[var(--wheel-ink)] sm:px-4 sm:text-sm">
                  {result.couponCode}
                </code>
                <button type="button" onClick={onCopy} className="btn-secondary shrink-0 self-center px-3 py-2.5 sm:self-auto" aria-label="Copy code">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--wheel-ink-muted)]">{t('wheel.codeHint')}</p>
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
  const [showConfetti, setShowConfetti] = useState(false)
  const rotationBase = useRef(0)
  const spinTimer = useRef<number | null>(null)
  const preSpinTimer = useRef<number | null>(null)

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
      if (spinTimer.current) window.clearTimeout(spinTimer.current)
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
      rotationBase.current += 28
      setRotation(rotationBase.current)
    }, 36)
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
      setShowConfetti(true)
      const timer = window.setTimeout(() => setShowConfetti(false), 1500)
      return () => window.clearTimeout(timer)
    }
    setShowConfetti(false)
  }, [result, spinning])

  async function handleSpin() {
    if (spinning || preSpinning || alreadySpun || !prizes.length) return
    setError('')
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

      const currentRotation = rotationBase.current
      const target = computeWheelTargetRotation(
        currentRotation,
        spinResult.segmentIndex,
        prizes.length,
      )

      rotationBase.current = target
      setSpinning(true)
      requestAnimationFrame(() => setRotation(target))

      spinTimer.current = window.setTimeout(() => {
        setSpinning(false)
        setResult(spinResult)
        setAlreadySpun(true)
        if (customer && !spinResult.requiresLogin) {
          localStorage.removeItem(PENDING_SPIN_KEY)
        }
      }, WHEEL_SPIN_MS + 160)
    } catch (err) {
      stopPreSpin()
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
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={`wheel-modal-shell relative w-full overflow-hidden${result && !wheelBusy ? ' wheel-modal-shell--with-result' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {showConfetti && <Confetti />}

            <div className="wheel-sheet-handle sm:hidden" aria-hidden />

            <button
              type="button"
              onClick={onClose}
              disabled={wheelBusy}
              className="wheel-close-btn absolute end-3 top-3 z-20 rounded-full p-2.5 transition disabled:opacity-40 sm:p-2"
              aria-label={t('wheel.close')}
            >
              <X size={18} />
            </button>

            <div className="wheel-modal-header px-4 pb-3 pt-2 text-center sm:px-6 sm:pb-4 sm:pt-5">
              <p className="wheel-eyebrow">{t('wheel.label')}</p>
              <h2 id="lucky-wheel-title" className="wheel-title mt-1 font-serif text-[var(--wheel-ink)]">
                {t('wheel.title')}
              </h2>
              {!result && !spinning && (
                <p className="mx-auto mt-2 max-w-[300px] text-sm text-[var(--wheel-ink-muted)] sm:max-w-sm">
                  {t('wheel.subtitle')}
                </p>
              )}
            </div>

            <div className="wheel-modal-body wheel-modal-panel relative px-3 py-4 sm:px-6 sm:py-5">
              {loading && !prizes.length ? (
                <p className="py-14 text-center text-sm text-[var(--wheel-ink-muted)]">{t('common.loading')}</p>
              ) : prizes.length === 0 ? (
                <p className="py-14 text-center text-sm text-[var(--wheel-ink-muted)]">{t('wheel.unavailable')}</p>
              ) : (
                <div className="wheel-layout">
                  <div className="wheel-stage-wrap relative">
                    <WheelCanvas
                      prizes={prizes}
                      rotation={rotation}
                      spinning={spinning}
                      preSpinning={preSpinning}
                      spinDurationMs={WHEEL_SPIN_MS}
                      highlightIndex={highlightIndex}
                    />

                    {/* Center spin button */}
                    {canSpin && (
                      <button
                        type="button"
                        onClick={handleSpin}
                        className="wheel-center-btn wheel-spin-cta absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                        aria-label={t('wheel.spin')}
                      >
                        <span className="wheel-spin-cta__label">Spin</span>
                      </button>
                    )}

                    {(spinning || preSpinning) && (
                      <div className="wheel-center-btn wheel-center-btn--busy absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full">
                        <div className="wheel-spin-pulse h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5" />
                        <span className="wheel-eyebrow mt-2 text-[0.62rem] sm:mt-2.5">
                          {t('wheel.spinning')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="wheel-side-panel">
                    {error && (
                      <p className="mt-3 text-center text-sm text-red-700/90" role="alert">
                        {error}
                      </p>
                    )}

                    {result && !spinning && !preSpinning && (
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
