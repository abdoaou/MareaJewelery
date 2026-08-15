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

function adminHostname() {
  if (!env.adminUrl) return null
  try {
    return new URL(env.adminUrl).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isAdminHost(req) {
  const host = (req.hostname || '').toLowerCase()
  const expected = adminHostname()
  if (expected && host === expected) return true
  return host.startsWith('admin.')
}

function adminSpaFallback(staticRoot) {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (path.extname(req.path)) return next()
    res.sendFile(path.join(staticRoot, 'index.html'), (err) => (err ? next(err) : undefined))
  }
}

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

// Main domain /admin → admin subdomain (e.g. admin.mareajewlery.online)
if (hasAdmin && env.adminUrl) {
  app.use((req, res, next) => {
    if (isAdminHost(req)) return next()
    if (req.path === '/admin') {
      return res.redirect(302, `${env.adminUrl.replace(/\/$/, '')}/login`)
    }
    if (req.path.startsWith('/admin/')) {
      const rest = req.path.slice('/admin'.length) || '/'
      return res.redirect(302, `${env.adminUrl.replace(/\/$/, '')}${rest}`)
    }
    next()
  })
}

// Admin subdomain — serve admin SPA at /
if (hasAdmin) {
  app.use((req, res, next) => {
    if (!isAdminHost(req)) return next()
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next()
    }
    express.static(adminDist, { index: false, maxAge: '1d', redirect: false })(req, res, () => {
      adminSpaFallback(adminDist)(req, res, next)
    })
  })
}

// Legacy path-based admin on main domain (when admin is built with base /admin/)
if (hasAdmin) {
  app.get('/admin', (_req, res) => res.redirect(302, '/admin/'))
  app.use('/admin', (req, res, next) => {
    if (isAdminHost(req)) return next()
    express.static(adminDist, { index: false, maxAge: '1d', redirect: false })(req, res, () => {
      adminSpaFallback(adminDist)(req, res, next)
    })
  })
}

// Storefront on main domain only
if (hasWebsite) {
  app.use((req, res, next) => {
    if (isAdminHost(req)) return next()
    express.static(websiteDist, { index: false, maxAge: '1d' })(req, res, next)
  })
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (isAdminHost(req)) return next()
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
} else if (!hasAdmin) {
  app.get('/', (_req, res) => {
    res.redirect(`/api/${env.apiVersion}/docs`)
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

export default app
