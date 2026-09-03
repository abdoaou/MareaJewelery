import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import LuckyWheelModal, { POPUP_KEY, PENDING_SPIN_KEY } from './LuckyWheelModal'
import SpinWinButton from './SpinWinButton'
import { api, type WheelPrize, type WheelStatus } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

interface LuckyWheelContextValue {
  openWheel: () => void
  prizes: WheelPrize[]
  wheelReady: boolean
  refreshWheel: (opts?: { silent?: boolean }) => Promise<void>
  applyStatus: (status: WheelStatus) => void
}

const LuckyWheelContext = createContext<LuckyWheelContextValue | null>(null)

export function LuckyWheelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [wheelReady, setWheelReady] = useState(false)
  const { customer, ready } = useAuth()
  const statusRef = useRef<WheelStatus | null>(null)
  const popupChecked = useRef(false)

  const refreshWheel = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const [prizesRes, statusRes] = await Promise.all([
        api.getWheelPrizes({ silent: true }),
        api.getWheelStatus({ silent: opts?.silent ?? true }),
      ])
      setPrizes(prizesRes.data)
      statusRef.current = statusRes.data
      setWheelReady(true)
    } catch {
      if (!opts?.silent) setWheelReady(false)
    }
  }, [])

  const applyStatus = useCallback((status: WheelStatus) => {
    statusRef.current = status
  }, [])

  const openWheel = useCallback(() => setOpen(true), [])

  // Prefetch wheel data as soon as auth boot completes
  useEffect(() => {
    if (!ready) return
    void refreshWheel({ silent: true })
  }, [ready, refreshWheel])

  // Auto-popup once — uses cached status (no extra wait)
  useEffect(() => {
    if (!ready || !wheelReady || popupChecked.current) return
    if (localStorage.getItem(POPUP_KEY)) return

    popupChecked.current = true
    const timer = window.setTimeout(() => {
      const status = statusRef.current
      if (status?.canSpin) {
        localStorage.setItem(POPUP_KEY, '1')
        setOpen(true)
      }
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [ready, wheelReady])

  useEffect(() => {
    if (!customer) return
    const spinId = localStorage.getItem(PENDING_SPIN_KEY)
    if (!spinId) return

    void api.claimWheel(spinId).then(() => {
      localStorage.removeItem(PENDING_SPIN_KEY)
    }).catch(() => {})
  }, [customer])

  const value = useMemo(
    () => ({ openWheel, prizes, wheelReady, refreshWheel, applyStatus }),
    [openWheel, prizes, wheelReady, refreshWheel, applyStatus],
  )

  return (
    <LuckyWheelContext.Provider value={value}>
      {children}
      <SpinWinButton onClick={openWheel} />
      <LuckyWheelModal open={open} onClose={() => setOpen(false)} />
    </LuckyWheelContext.Provider>
  )
}

export function useLuckyWheel() {
  const ctx = useContext(LuckyWheelContext)
  if (!ctx) throw new Error('useLuckyWheel must be used within LuckyWheelProvider')
  return ctx
}
