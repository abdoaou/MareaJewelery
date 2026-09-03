import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api, type WheelPrize, type WheelSpinResult } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import WheelCanvas from './WheelCanvas'

const POPUP_KEY = 'marea_wheel_popup_seen'
const PENDING_SPIN_KEY = 'marea_wheel_pending_spin_id'

export { POPUP_KEY, PENDING_SPIN_KEY }

interface LuckyWheelModalProps {
  open: boolean
  onClose: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            backgroundColor: i % 3 === 0 ? '#e8d5a3' : i % 3 === 1 ? '#c9a962' : '#f5efe3',
          }}
          initial={{
            opacity: 1,
            x: '50%',
            y: '40%',
            scale: 0,
          }}
          animate={{
            opacity: [1, 1, 0],
            x: `${10 + Math.random() * 80}%`,
            y: `${10 + Math.random() * 70}%`,
            rotate: Math.random() * 720,
            scale: [0, 1, 0.6],
          }}
          transition={{ duration: 1.8, delay: i * 0.03, ease: 'easeOut' }}
        />
      ))}
    </div>
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
  const rotationRef = useRef(0)

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
    if (result?.isWinner && !result.alreadyUsed) {
      setShowConfetti(true)
      const timer = window.setTimeout(() => setShowConfetti(false), 2200)
      return () => window.clearTimeout(timer)
    }
    setShowConfetti(false)
  }, [result])

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
      const extraTurns = 5 * 360
      const target =
        extraTurns + (360 - spinResult.segmentIndex * segmentAngle - segmentAngle / 2)
      rotationRef.current = target
      setSpinning(true)
      setRotation(target)

      window.setTimeout(() => {
        setSpinning(false)
        setResult(spinResult)
        setAlreadySpun(true)
        if (customer && spinResult.requiresLogin === false) {
          localStorage.removeItem(PENDING_SPIN_KEY)
        }
      }, 4600)
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

  const canSpin = !loading && !alreadySpun && prizes.length > 0 && !spinning

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-marea-bg/75 px-4 py-8 backdrop-blur-sm"
          onClick={!spinning && !processing ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lucky-wheel-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-marea-gold/25 bg-marea-bg-soft shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(201,169,98,0.08)]"
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

            <div className="relative border-b border-marea-gold/15 px-6 pb-5 pt-7 text-center">
              <p className="section-label text-marea-gold">{t('wheel.label')}</p>
              <h2 id="lucky-wheel-title" className="mt-1 font-serif text-[1.75rem] tracking-wide text-marea-cream sm:text-3xl">
                {t('wheel.title')}
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-marea-muted">{t('wheel.subtitle')}</p>
            </div>

            <div className="wheel-modal-panel relative px-5 py-7 sm:px-8">
              {loading ? (
                <p className="py-16 text-center text-marea-muted">{t('common.loading')}</p>
              ) : prizes.length === 0 ? (
                <p className="py-16 text-center text-marea-muted">{t('wheel.unavailable')}</p>
              ) : (
                <>
                  <WheelCanvas
                    prizes={prizes}
                    rotation={rotation}
                    spinning={spinning}
                  />

                  {error && (
                    <p className="mt-4 text-center text-sm text-red-400" role="alert">
                      {error}
                    </p>
                  )}

                  {!result && !spinning && (
                    <button
                      type="button"
                      onClick={handleSpin}
                      disabled={!canSpin || processing}
                      className="btn-primary mx-auto mt-8 block min-w-[180px] rounded-full px-8 py-3.5 text-sm tracking-wide shadow-[0_4px_24px_rgba(201,169,98,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processing ? t('common.loading') : t('wheel.spin')}
                    </button>
                  )}

                  {spinning && (
                    <p className="mt-6 text-center text-sm text-marea-gold">{t('wheel.spinning')}</p>
                  )}

                  {result && !spinning && (
                    <div className="mt-6 space-y-4 text-center">
                      {result.isWinner ? (
                        <>
                          <p className="font-serif text-xl text-marea-gold">
                            {result.alreadyUsed
                              ? t('wheel.wonBefore', { prize: result.prize?.name })
                              : t('wheel.congrats', { prize: result.prize?.name })}
                          </p>
                          {result.couponCode && (
                            <div className="flex items-center justify-center gap-2">
                              <code className="rounded-lg border border-marea-gold/40 bg-marea-bg px-3 py-2 text-sm text-marea-cream">
                                {result.couponCode}
                              </code>
                              <button type="button" onClick={copyCode} className="btn-secondary px-3 py-2">
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                            </div>
                          )}
                          {result.requiresLogin && !customer ? (
                            <div className="space-y-3 pt-2">
                              <p className="text-sm text-marea-muted">{t('wheel.claimPrompt')}</p>
                              <div className="flex flex-wrap justify-center gap-3">
                                <Link to="/login" className="btn-primary px-5 py-2.5 text-sm" onClick={onClose}>
                                  {t('nav.login')}
                                </Link>
                                <Link to="/register" className="btn-secondary px-5 py-2.5 text-sm" onClick={onClose}>
                                  {t('nav.register')}
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-marea-muted">
                              {result.alreadyUsed ? t('wheel.alreadyUsed') : t('wheel.saved')}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-serif text-lg text-marea-cream">{t('wheel.noLuck')}</p>
                          {result.alreadyUsed && (
                            <p className="text-sm text-marea-muted">{t('wheel.alreadyUsed')}</p>
                          )}
                        </>
                      )}
                    </div>
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
