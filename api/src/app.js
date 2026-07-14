import express from 'express'
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

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: env.cors.origin, credentials: true }))
app.use(compression())
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/', (_req, res) => {
  res.redirect(`/api/${env.apiVersion}/docs`)
})

app.use(`/api/${env.apiVersion}`, apiLimiter, routes)
setupSwagger(app)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
