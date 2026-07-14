import { create } from 'zustand'
import { dashboardApi } from '../services/api'
import type { Notification } from '../types'
import { playNotificationSound } from '../utils/notificationSound'
import { showBrowserNotification } from '../utils/browserNotifications'
import { getNotificationPath } from '../utils/notificationNav'

interface Toast {
  id: string
  title: string
  message: string
  type: string
  href?: string
}

interface NotificationState {
  items: Notification[]
  toasts: Toast[]
  unread: number
  fetch: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  notify: (toast: Omit<Toast, 'id'>, alertKey?: string) => void
  pushToast: (toast: Omit<Toast, 'id'>, alertKey?: string) => void
  removeToast: (id: string) => void
}

const recentAlertKeys = new Map<string, number>()
let initialFetchDone = false

function shouldAlert(key: string) {
  const now = Date.now()
  const last = recentAlertKeys.get(key)
  if (last && now - last < 8000) return false
  recentAlertKeys.set(key, now)
  return true
}

function alertUser(toast: Omit<Toast, 'id'>) {
  playNotificationSound()
  showBrowserNotification(toast.title, {
    body: toast.message,
    tag: toast.type,
    href: toast.href,
  })
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  toasts: [],
  unread: 0,

  fetch: async () => {
    const res = await dashboardApi.notifications()
    const items = res.data || []

    if (!initialFetchDone) {
      items.forEach((n) => recentAlertKeys.set(`db:${n.id}`, Date.now()))
      initialFetchDone = true
    } else {
      for (const n of items) {
        if (n.isRead) continue
        get().notify(
          {
            title: n.title,
            message: n.message,
            type: n.type,
            href: getNotificationPath(n.type, n.data) ?? undefined,
          },
          `db:${n.id}`,
        )
      }
    }

    set({ items, unread: items.filter((n) => !n.isRead).length })
  },

  markRead: async (id) => {
    await dashboardApi.markRead(id)
    const items = get().items.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    set({ items, unread: items.filter((n) => !n.isRead).length })
  },

  markAllRead: async () => {
    await dashboardApi.markAllRead()
    const items = get().items.map((n) => ({ ...n, isRead: true }))
    set({ items, unread: 0 })
  },

  notify: (toast, alertKey) => {
    const key = alertKey || `toast:${toast.type}:${toast.title}:${Date.now()}`
    if (!shouldAlert(key)) return

    alertUser(toast)

    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { ...toast, id }] })
    setTimeout(() => get().removeToast(id), 8000)
  },

  pushToast: (toast, alertKey) => {
    get().notify(toast, alertKey)
  },

  removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export function resetNotificationAlerts() {
  initialFetchDone = false
  recentAlertKeys.clear()
}
