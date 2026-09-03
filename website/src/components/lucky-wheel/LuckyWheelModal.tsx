import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check, Gift, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api, type WheelPrize, type WheelSpinResult, type WheelStatus } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useLuckyWheel } from './LuckyWheelProvider'
import WheelCanvas, { WHEEL_SPIN_MS } from './WheelCanvas'

const POPUP_KEY = 'marea_wheel_popup_seen'
const PENDING_SPIN_KEY = 'marea_wheel_pending_spin_id'

export { POPUP_KEY, PENDING_SPIN_KEY }

interface LuckyWheelModalProps {
  open: boolean
  onClose: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: i % 2 === 0 ? '#c9a962' : '#e8d5a3' }}
          initial={{ opacity: 1, x: '50%', y: '35%', scale: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: `${15 + Math.random() * 70}%`,
            y: `${15 + Math.random() * 60}%`,
            scale: [0, 1, 0.5],
          }}
          transition={{ duration: 1.2, delay: i * 0.025, ease: 'easeOut' }}
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="wheel-result-card mt-4 text-center sm:mt-5"
      >
        <p className="font-serif text-xl text-marea-cream">{t('wheel.noLuck')}</p>
        <p className="mt-2 text-sm text-marea-muted">{t('wheel.noLuckHint')}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-4 space-y-3 sm:mt-5 sm:space-y-4"
    >
      {/* Step 1: Prize reveal */}
      <div className="wheel-result-card relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-marea-gold/10 to-transparent" />
        <div className="relative px-3 py-4 sm:px-5 sm:py-5">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-marea-gold/40 bg-marea-gold/15 sm:mb-3 sm:h-11 sm:w-11">
            <Gift className="text-marea-gold" size={18} />
          </div>
          <p className="section-label text-marea-gold">{t('wheel.youWon')}</p>
          <p className="mt-1 font-serif text-2xl tracking-wide text-marea-cream sm:text-3xl md:text-4xl">
            {prizeHeadline(result.prize)}
          </p>
          {prizeSubline(result.prize) && (
            <p className="mt-1 text-sm text-marea-muted">{prizeSubline(result.prize)}</p>
          )}
        </div>
      </div>

      {/* Step 2: Claim or coupon */}
      {needsLogin ? (
        <div className="wheel-claim-card text-center">
          <Sparkles className="mx-auto mb-2 text-marea-gold" size={18} />
          <p className="font-medium text-marea-cream">{t('wheel.claimTitle')}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-marea-muted">{t('wheel.claimPrompt')}</p>
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
          <p className="text-sm text-marea-muted">
            {result.alreadyUsed ? t('wheel.alreadyUsed') : t('wheel.saved')}
          </p>
          {showCoupon && (
            <div className="mt-3">
              <p className="mb-2 text-xs tracking-wide text-marea-gold uppercase">{t('wheel.yourCode')}</p>
              <div className="mt-3 flex max-w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
                <code className="wheel-coupon-code rounded-lg border border-marea-gold/50 bg-marea-bg px-3 py-2.5 font-mono text-xs tracking-wider text-marea-cream sm:px-4 sm:text-sm">
                  {result.couponCode}
                </code>
                <button type="button" onClick={onCopy} className="btn-secondary shrink-0 self-center px-3 py-2.5 sm:self-auto" aria-label="Copy code">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-marea-muted">{t('wheel.codeHint')}</p>
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

      const count = prizes.length
      const segmentAngle = 360 / count
      const extraTurns = 4 * 360
      const targetOffset = 360 - spinResult.segmentIndex * segmentAngle - segmentAngle / 2
      const target = rotationBase.current + extraTurns + targetOffset

      rotationBase.current = target
      setSpinning(true)
      setRotation(rotationBase.current)
      requestAnimationFrame(() => setRotation(target))

      spinTimer.current = window.setTimeout(() => {
        setSpinning(false)
        setResult(spinResult)
        setAlreadySpun(true)
        if (customer && !spinResult.requiresLogin) {
          localStorage.removeItem(PENDING_SPIN_KEY)
        }
      }, WHEEL_SPIN_MS + 80)
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
          className="wheel-overlay fixed inset-0 z-[70] flex bg-marea-bg/80 backdrop-blur-sm"
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
            className="wheel-modal-shell relative w-full overflow-hidden border border-marea-gold/20 bg-marea-bg-soft shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {showConfetti && <Confetti />}

            <div className="wheel-sheet-handle sm:hidden" aria-hidden />

            <button
              type="button"
              onClick={onClose}
              disabled={wheelBusy}
              className="absolute end-3 top-3 z-20 rounded-full bg-marea-bg/60 p-2.5 text-marea-muted backdrop-blur-sm transition hover:bg-marea-bg-card hover:text-marea-cream disabled:opacity-40 sm:end-3 sm:top-3 sm:bg-transparent sm:p-2 sm:backdrop-blur-none"
              aria-label={t('wheel.close')}
            >
              <X size={18} />
            </button>

            <div className="wheel-modal-header border-b border-marea-gold/15 px-4 pb-3 pt-2 text-center sm:px-6 sm:pb-4 sm:pt-6">
              <p className="section-label text-marea-gold">{t('wheel.label')}</p>
              <h2 id="lucky-wheel-title" className="mt-0.5 font-serif text-xl text-marea-cream sm:text-2xl md:text-3xl">
                {t('wheel.title')}
              </h2>
              {!result && !spinning && (
                <p className="mx-auto mt-1.5 max-w-[280px] text-xs text-marea-muted sm:max-w-xs">{t('wheel.subtitle')}</p>
              )}
            </div>

            <div className="wheel-modal-panel relative px-3 py-4 sm:px-6 sm:py-5">
              {loading && !prizes.length ? (
                <p className="py-14 text-center text-sm text-marea-muted">{t('common.loading')}</p>
              ) : prizes.length === 0 ? (
                <p className="py-14 text-center text-sm text-marea-muted">{t('wheel.unavailable')}</p>
              ) : (
                <>
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
                        className="wheel-center-btn absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-marea-gold bg-gradient-to-br from-marea-gold via-[#b8944f] to-[#9a7b3c] text-marea-bg shadow-[0_4px_20px_rgba(201,169,98,0.45)] transition hover:scale-105 hover:brightness-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marea-gold"
                        aria-label={t('wheel.spin')}
                      >
                        <span className="text-[0.55rem] font-semibold tracking-[0.18em] uppercase sm:text-[0.65rem]">Spin</span>
                        <span className="font-serif text-base leading-tight sm:text-lg">GO</span>
                      </button>
                    )}

                    {(spinning || preSpinning) && (
                      <div className="wheel-center-btn wheel-center-btn--busy absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-marea-gold/60 bg-marea-bg/95 backdrop-blur-sm">
                        <div className="wheel-spin-pulse h-2 w-2 rounded-full bg-marea-gold sm:h-2.5 sm:w-2.5" />
                        <span className="mt-2 text-[0.55rem] font-medium tracking-wider text-marea-gold uppercase sm:mt-2.5 sm:text-[0.6rem]">
                          {t('wheel.spinning')}
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="mt-3 text-center text-sm text-red-400" role="alert">
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
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
