const KEY = 'marea_pending_like'

export type PendingLike = {
  productId: string
  returnTo?: string
}

export function setPendingLike(data: PendingLike) {
  sessionStorage.setItem(KEY, JSON.stringify(data))
}

export function getPendingLike(): PendingLike | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingLike) : null
  } catch {
    return null
  }
}

export function clearPendingLike() {
  sessionStorage.removeItem(KEY)
}

export async function processPendingLike(toggle: (productId: string) => Promise<boolean>) {
  const pending = getPendingLike()
  if (!pending) return null
  clearPendingLike()
  await toggle(pending.productId)
  return pending.returnTo || '/likes'
}
