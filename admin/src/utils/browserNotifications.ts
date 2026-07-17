import { unlockNotificationAudio } from './notificationSound'

export type AlertPermission = NotificationPermission | 'unsupported'

export function getNotificationPermission(): AlertPermission {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<AlertPermission> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** Show a system notification (works on phone when added to home screen or tab in background). */
export function showBrowserNotification(
  title: string,
  options?: { body?: string; tag?: string; href?: string },
) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const mobile = isMobileDevice()
  const tabHidden = document.visibilityState !== 'visible'

  // Desktop: only OS banner when tab is hidden. Mobile: always show OS banner too.
  if (!tabHidden && !mobile) return

  try {
    const notification = new Notification(title, {
      body: options?.body,
      tag: options?.tag || 'marea-admin',
      icon: `${import.meta.env.BASE_URL}icon.svg`,
      badge: `${import.meta.env.BASE_URL}icon.svg`,
      requireInteraction: mobile,
      data: { href: options?.href || import.meta.env.BASE_URL || '/' },
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
      if (options?.href) {
        window.location.href = options.href
      }
    }
  } catch {
    // Some browsers block Notification constructor
  }
}

export async function enableAlerts(): Promise<AlertPermission> {
  await unlockNotificationAudio()
  return requestNotificationPermission()
}
