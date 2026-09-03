import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check, Gift, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api, type WheelPrize, type WheelSpinResult } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
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
        className="wheel-result-card mt-5 text-center"
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
      className="mt-5 space-y-4"
    >
      {/* Step 1: Prize reveal */}
      <div className="wheel-result-card relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-marea-gold/10 to-transparent" />
        <div className="relative px-4 py-5">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-marea-gold/40 bg-marea-gold/15">
            <Gift className="text-marea-gold" size={20} />
          </div>
          <p className="section-label text-marea-gold">{t('wheel.youWon')}</p>
          <p className="mt-1 font-serif text-3xl tracking-wide text-marea-cream sm:text-4xl">
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
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="btn-primary min-w-[120px] px-5 py-2.5 text-sm" onClick={onClose}>
              {t('nav.login')}
            </Link>
            <Link to="/register" className="btn-secondary min-w-[120px] px-5 py-2.5 text-sm" onClick={onClose}>
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
              <div className="flex items-center justify-center gap-2">
                <code className="rounded-lg border border-marea-gold/50 bg-marea-bg px-4 py-2.5 font-mono text-sm tracking-wider text-marea-cream">
                  {result.couponCode}
                </code>
                <button type="button" onClick={onCopy} className="btn-secondary px-3 py-2.5" aria-label="Copy code">
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
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelSpinResult | null>(null)
  const [alreadySpun, setAlreadySpun] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const rotationBase = useRef(0)
  const spinTimer = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [prizesRes, statusRes] = await Promise.all([
        api.getWheelPrizes({ silent: true }),
        api.getWheelStatus({ silent: true }),
      ])
      setPrizes(prizesRes.data)
      if (statusRes.data.alreadySpun && statusRes.data.result) {
        setAlreadySpun(true)
        setResult(statusRes.data.result)
      } else {
        setAlreadySpun(false)
        setResult(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wheel.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!open) return
    void load()
    return () => {
      if (spinTimer.current) window.clearTimeout(spinTimer.current)
    }
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !spinning && !processing) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, spinning, processing])

  useEffect(() => {
    if (result?.isWinner && !spinning) {
      setShowConfetti(true)
      const timer = window.setTimeout(() => setShowConfetti(false), 1500)
      return () => window.clearTimeout(timer)
    }
    setShowConfetti(false)
  }, [result, spinning])

  async function handleSpin() {
    if (processing || spinning || alreadySpun || !prizes.length) return
    setProcessing(true)
    setError('')

    try {
      const res = await api.spinWheel()
      const spinResult = res.data

      if (spinResult.alreadyUsed) {
        setAlreadySpun(true)
        setResult(spinResult)
        return
      }

      localStorage.setItem(PENDING_SPIN_KEY, spinResult.spinId)

      const count = prizes.length
      const segmentAngle = 360 / count
      const extraTurns = 3 * 360
      const targetOffset = 360 - spinResult.segmentIndex * segmentAngle - segmentAngle / 2
      const target = rotationBase.current + extraTurns + targetOffset

      rotationBase.current = target
      setSpinning(true)
      setRotation(target)

      spinTimer.current = window.setTimeout(() => {
        setSpinning(false)
        setResult(spinResult)
        setAlreadySpun(true)
        if (customer && !spinResult.requiresLogin) {
          localStorage.removeItem(PENDING_SPIN_KEY)
        }
      }, WHEEL_SPIN_MS + 80)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wheel.spinFailed'))
    } finally {
      setProcessing(false)
    }
  }

  function copyCode() {
    if (!result?.couponCode) return
    void navigator.clipboard.writeText(result.couponCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const canSpin = !loading && !alreadySpun && prizes.length > 0 && !spinning && !processing
  const highlightIndex = result && !spinning ? result.segmentIndex : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-marea-bg/80 px-4 py-6 backdrop-blur-sm"
          onClick={!spinning && !processing ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lucky-wheel-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-marea-gold/20 bg-marea-bg-soft shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {showConfetti && <Confetti />}

            <button
              type="button"
              onClick={onClose}
              disabled={spinning || processing}
              className="absolute end-3 top-3 z-20 rounded-full p-2 text-marea-muted transition hover:bg-marea-bg-card hover:text-marea-cream disabled:opacity-40"
              aria-label={t('wheel.close')}
            >
              <X size={18} />
            </button>

            <div className="border-b border-marea-gold/10 px-5 pb-4 pt-6 text-center">
              <p className="section-label text-marea-gold">{t('wheel.label')}</p>
              <h2 id="lucky-wheel-title" className="mt-0.5 font-serif text-2xl text-marea-cream">
                {t('wheel.title')}
              </h2>
              {!result && !spinning && (
                <p className="mx-auto mt-1.5 max-w-[260px] text-xs text-marea-muted">{t('wheel.subtitle')}</p>
              )}
            </div>

            <div className="wheel-modal-panel relative px-4 py-5 sm:px-6">
              {loading ? (
                <p className="py-14 text-center text-sm text-marea-muted">{t('common.loading')}</p>
              ) : prizes.length === 0 ? (
                <p className="py-14 text-center text-sm text-marea-muted">{t('wheel.unavailable')}</p>
              ) : (
                <>
                  <div className="relative">
                    <WheelCanvas
                      prizes={prizes}
                      rotation={rotation}
                      spinning={spinning}
                      spinDurationMs={WHEEL_SPIN_MS}
                      highlightIndex={highlightIndex}
                    />

                    {/* Center spin button */}
                    {canSpin && (
                      <button
                        type="button"
                        onClick={handleSpin}
                        className="absolute left-1/2 top-1/2 z-20 flex h-[5.5rem] w-[5.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-marea-gold bg-gradient-to-br from-marea-gold via-[#b8944f] to-[#9a7b3c] text-marea-bg shadow-[0_4px_20px_rgba(201,169,98,0.45)] transition hover:scale-105 hover:brightness-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marea-gold"
                        aria-label={t('wheel.spin')}
                      >
                        <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase">Spin</span>
                        <span className="font-serif text-lg leading-tight">GO</span>
                      </button>
                    )}

                    {(spinning || processing) && (
                      <div className="absolute left-1/2 top-1/2 z-20 flex h-[5.5rem] w-[5.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-marea-gold/60 bg-marea-bg/90">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-marea-gold/30 border-t-marea-gold" />
                        <span className="mt-1.5 text-[0.6rem] tracking-wider text-marea-gold uppercase">
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

                  {result && !spinning && (
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
