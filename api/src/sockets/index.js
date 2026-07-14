import { Server } from 'socket.io'
import { logger } from '../shared/utils/logger.js'

let io = null

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  })

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { id: socket.id })

    socket.on('join', (room) => {
      if (room === 'admin' || room === 'customer') socket.join(room)
    })

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { id: socket.id })
    })
  })

  return io
}

export function getIO() {
  return io
}

export function notifyAdmin(event, data) {
  io?.to('admin').emit(event, data)
}

export function notifyCustomer(userId, event, data) {
  io?.to(`user:${userId}`).emit(event, data)
}

export function broadcastLiveSale(data) {
  io?.emit('live_sale', data)
}
