import http from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { ensureSiteVisitsTable, ensureWheelTables, seedDefaultWheelPrizes } from './config/ensureSchema.js'
import { initSocket } from './sockets/index.js'
import { logger } from './shared/utils/logger.js'

const server = http.createServer(app)
initSocket(server)

async function start() {
  try {
    await prisma.$connect()
    logger.info('Database connected')
    await ensureSiteVisitsTable()
    await ensureWheelTables()
    await seedDefaultWheelPrizes()
  } catch (err) {
    logger.warn('Database connection failed at startup', { error: err.message })
  }

  server.listen(env.port, '0.0.0.0', () => {
    logger.info(`Marea API running on http://localhost:${env.port}`)
    logger.info(`Swagger docs: http://localhost:${env.port}/api/${env.apiVersion}/docs`)
  })
}

start()

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  server.close()
})
