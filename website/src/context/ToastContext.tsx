import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { setErrorReporter } from '../services/errorReporter'

interface ToastItem {
  id: string
  message: string
}

interface ToastContextValue {
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_MS = 5500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showError = useCallback((message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev.slice(-2), { id, message }])
    window.setTimeout(() => dismiss(id), TOAST_MS)
  }, [dismiss])

  useEffect(() => {
    setErrorReporter(showError)
    return () => setErrorReporter(null)
  }, [showError])

  const value = useMemo(() => ({ showError }), [showError])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-red-400/30 bg-marea-bg/95 px-4 py-3 shadow-xl backdrop-blur-md"
              role="alert"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" aria-hidden />
              <p className="flex-1 text-sm leading-relaxed text-marea-cream">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-1 text-marea-muted transition hover:text-marea-cream"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
