import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { setupSwagger } from './config/swagger.js'
import { apiLimiter } from './shared/middleware/rateLimiter.js'
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const websiteDist = path.join(__dirname, '../../website/dist')
const adminDist = path.join(__dirname, '../../admin/dist')
const hasWebsite = fs.existsSync(path.join(websiteDist, 'index.html'))
const hasAdmin = fs.existsSync(path.join(adminDist, 'index.html'))

app.set('trust proxy', 1)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
)
app.use(cors({ origin: env.cors.origin, credentials: true }))
app.use(compression())
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use(`/api/${env.apiVersion}`, apiLimiter, routes)
setupSwagger(app)

// Admin panel at /admin (same Railway domain)
if (hasAdmin) {
  app.use('/admin', express.static(adminDist, { index: false, maxAge: '1d' }))
  app.use('/admin', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    res.sendFile(path.join(adminDist, 'index.html'), (err) => (err ? next(err) : undefined))
  })
}

// Storefront at / (same Railway domain)
if (hasWebsite) {
  app.use(express.static(websiteDist, { index: false, maxAge: '1d' }))
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/admin') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next()
    }
    res.sendFile(path.join(websiteDist, 'index.html'), (err) => (err ? next(err) : undefined))
  })
} else {
  app.get('/', (_req, res) => {
    res.redirect(`/api/${env.apiVersion}/docs`)
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

export default app
