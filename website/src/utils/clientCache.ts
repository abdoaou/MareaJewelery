/**
 * Tiny client-side cache with TTL + in-flight deduplication.
 * Repeat navigations (home -> product -> back) render instantly
 * instead of re-hitting the remote API every time.
 */
const store = new Map<string, { expiresAt: number; value: unknown }>()
const inFlight = new Map<string, Promise<unknown>>()

export function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return Promise.resolve(hit.value as T)
  }

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const promise = fetcher()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, promise)
  return promise
}

export function invalidateCached(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
