import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Moon, Sun, Menu, BellRing } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import { getNotificationPath } from '../../utils/notificationNav'
import { enableAlerts, getNotificationPermission } from '../../utils/browserNotifications'
import { unlockNotificationAudio } from '../../utils/notificationSound'
import type { Notification } from '../../types'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate()
  const { theme, toggle } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const { items, unread, fetch, markRead, markAllRead } = useNotificationStore()
  const [open, setOpen] = useState(false)
  const [alertPermission, setAlertPermission] = useState(getNotificationPermission())

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 60000)
    return () => clearInterval(interval)
  }, [fetch])

  async function handleEnableAlerts() {
    await unlockNotificationAudio()
    const perm = await enableAlerts()
    setAlertPermission(perm)
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.isRead) await markRead(n.id)
    setOpen(false)
    const path = getNotificationPath(n.type, n.data)
    if (path) navigate(path)
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 sm:h-16 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="btn-ghost rounded-full p-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
        {alertPermission !== 'granted' && alertPermission !== 'unsupported' && (
          <button
            type="button"
            onClick={handleEnableAlerts}
            className="btn-ghost flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-gold sm:px-3"
            title="Enable sound and phone notifications"
          >
            <BellRing size={14} />
            <span className="hidden sm:inline">Enable alerts</span>
          </button>
        )}
        <button
          type="button"
          onClick={toggle}
          className="btn-ghost rounded-full p-2"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="btn-ghost relative rounded-full p-2"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-black">
                {unread}
              </span>
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                  <p className="text-sm font-medium">Notifications</p>
                  {unread > 0 && (
                    <button type="button" onClick={markAllRead} className="text-xs text-gold hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted">No notifications</p>
                  ) : (
                    items.slice(0, 20).map((n) => {
                      const path = getNotificationPath(n.type, n.data)
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-sm hover:bg-white/5 ${!n.isRead ? 'bg-gold/5' : ''} ${path ? 'cursor-pointer' : ''}`}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="mt-0.5 text-muted">{n.message}</p>
                          <p className="mt-1 text-xs text-subtle">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            {path && <span className="ml-2 text-gold/80">· View</span>}
                          </p>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-2 py-1.5 sm:px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
            {(user?.firstName?.[0] || user?.email?.[0] || 'A').toUpperCase()}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium">{user?.firstName || 'Admin'}</p>
            <p className="text-xs text-muted">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
