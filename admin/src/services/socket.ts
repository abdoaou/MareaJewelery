import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(onEvent: (event: string, data: unknown) => void) {
  if (socket?.connected) return socket

  socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket', 'polling'] })

  socket.on('connect', () => {
    socket?.emit('join', 'admin')
  })

  const events = [
    'new_order',
    'order_cancelled',
    'low_stock',
    'out_of_stock',
    'new_review',
    'refund_request',
    'payment_failed',
  ]

  events.forEach((event) => {
    socket?.on(event, (data) => onEvent(event, data))
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
