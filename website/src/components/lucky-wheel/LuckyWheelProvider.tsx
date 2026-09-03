import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import LuckyWheelModal, { POPUP_KEY, PENDING_SPIN_KEY } from './LuckyWheelModal'
import SpinWinButton from './SpinWinButton'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

interface LuckyWheelContextValue {
  openWheel: () => void
}

const LuckyWheelContext = createContext<LuckyWheelContextValue | null>(null)

export function LuckyWheelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { customer, ready } = useAuth()

  const openWheel = useCallback(() => setOpen(true), [])

  useEffect(() => {
    if (!ready) return
    if (localStorage.getItem(POPUP_KEY)) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const status = await api.getWheelStatus({ silent: true })
        if (cancelled) return
        if (status.data.canSpin) {
          localStorage.setItem(POPUP_KEY, '1')
          setOpen(true)
        }
      } catch {
        // ignore background check
      }
    }, 3500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [ready])

  useEffect(() => {
    if (!customer) return
    const spinId = localStorage.getItem(PENDING_SPIN_KEY)
    if (!spinId) return

    void api.claimWheel(spinId).then(() => {
      localStorage.removeItem(PENDING_SPIN_KEY)
    }).catch(() => {})
  }, [customer])

  const value = useMemo(() => ({ openWheel }), [openWheel])

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
