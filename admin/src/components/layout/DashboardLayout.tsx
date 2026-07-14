import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastStack } from '../ui/ToastStack'
import { connectSocket } from '../../services/socket'
import { useNotificationStore } from '../../store/notificationStore'
import { getNotificationPath } from '../../utils/notificationNav'

const eventLabels: Record<string, { title: string; message: (d: Record<string, unknown>) => string; type: string }> = {
  new_order: {
    type: 'NEW_ORDER',
    title: 'New Order',
    message: (d) => `Order ${d.orderNumber} — $${d.total}`,
  },
  order_cancelled: {
    type: 'ORDER_CANCELLED',
    title: 'Order Cancelled',
    message: (d) => `Order ${d.orderNumber}`,
  },
  low_stock: {
    type: 'LOW_STOCK',
    title: 'Low Stock',
    message: (d) => `${d.name}: ${d.stock} left`,
  },
  out_of_stock: {
    type: 'OUT_OF_STOCK',
    title: 'Out of Stock',
    message: (d) => String(d.name),
  },
  refund_request: {
    type: 'REFUND_REQUEST',
    title: 'Refund Request',
    message: (d) => `Order ${d.orderNumber}`,
  },
}

export function DashboardLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pushToast, fetch } = useNotificationStore()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    connectSocket((event, data) => {
      const cfg = eventLabels[event]
      if (cfg) {
        const payload = data as Record<string, unknown>
        const href = getNotificationPath(cfg.type, payload) ?? undefined
        const dedupeKey = `socket:${event}:${payload.orderId || payload.productId || payload.orderNumber || payload.name || ''}`
        pushToast(
          {
            title: cfg.title,
            message: cfg.message(payload),
            type: event,
            href,
          },
          dedupeKey,
        )
        fetch()
      }
    })

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetch()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pushToast, fetch])

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <ToastStack />
    </div>
  )
}
