import Redis from 'ioredis'
import { env } from './env.js'
import { logger } from '../shared/utils/logger.js'

let redis = null
const memory = new Map()

export function getRedis() {
  if (!env.redis.enabled) return null
  if (!redis) {
    redis = new Redis(env.redis.url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    })
    redis.on('error', (err) => logger.error('Redis error', { error: err.message }))
    redis.connect().catch(() => logger.warn('Redis unavailable — caching disabled'))
  }
  return redis
}

export async function cacheGet(key) {
  const client = getRedis()
  if (client) {
    try {
      const val = await client.get(key)
      if (val) return JSON.parse(val)
    } catch {
      /* fall through to memory */
    }
  }

  const row = memory.get(key)
  if (!row) return null
  if (row.expiresAt && row.expiresAt < Date.now()) {
    memory.delete(key)
    return null
  }
  return row.value
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  const client = getRedis()
  if (client) {
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
      /* ignore */
    }
  }
  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export async function cacheDel(pattern) {
  const client = getRedis()
  if (client) {
    try {
      const keys = await client.keys(pattern)
      if (keys.length) await client.del(...keys)
    } catch {
      /* ignore */
    }
  }

  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    for (const key of memory.keys()) {
      if (key.startsWith(prefix)) memory.delete(key)
    }
  } else {
    memory.delete(pattern)
  }
}
