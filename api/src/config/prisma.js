import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

const globalForPrisma = globalThis

/**
 * Tune Supabase pooler URLs so Prisma does not exhaust the pool.
 * - Transaction pooler (6543): pgbouncer=true + low connection_limit
 * - Session pooler (5432): keep connection_limit small (free-tier safe)
 */
function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL || env.databaseUrl
  if (!raw) return undefined

  try {
    const url = new URL(raw)
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com')
    const limit = String(process.env.DB_CONNECTION_LIMIT || (isSupabasePooler ? '5' : '10'))

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', limit)
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '30')
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', process.env.DB_CONNECT_TIMEOUT || '20')
    }

    // Transaction mode on Supabase (recommended for Prisma apps)
    if (isSupabasePooler && url.port === '6543' && !url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true')
    }

    return url.toString()
  } catch {
    return raw
  }
}

const datasourceUrl = resolveDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
    // Avoid logging every query in dev — it slows the event loop under pool pressure
    log: env.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  })

if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma

export default prisma
