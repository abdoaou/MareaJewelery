import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../../store/notificationStore'
import { X, ExternalLink } from 'lucide-react'

export function ToastStack() {
  const { toasts, removeToast } = useNotificationStore()
  const navigate = useNavigate()

  function openToast(id: string, href?: string) {
    removeToast(id)
    if (href) navigate(href)
  }

  return (
    <div className="fixed inset-x-4 top-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.href ? 'button' : undefined}
          tabIndex={t.href ? 0 : undefined}
          onClick={() => t.href && openToast(t.id, t.href)}
          onKeyDown={(e) => {
            if (t.href && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              openToast(t.id, t.href)
            }
          }}
          className={`toast-enter rounded-xl border border-gold/30 bg-[var(--color-surface-2)] p-4 shadow-xl ${
            t.href ? 'cursor-pointer hover:border-gold/60' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gold">{t.title}</p>
              <p className="mt-1 text-sm text-white/70">{t.message}</p>
              {t.href && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gold/80">
                  <ExternalLink size={12} /> Click to view
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeToast(t.id)
              }}
              className="shrink-0 text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
