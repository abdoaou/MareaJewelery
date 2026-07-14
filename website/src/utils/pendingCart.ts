const KEY = 'marea_pending_add'

export type PendingAdd = {
  productId: string
  returnTo?: string
}

export function setPendingAdd(data: PendingAdd) {
  sessionStorage.setItem(KEY, JSON.stringify(data))
}

export function getPendingAdd(): PendingAdd | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingAdd) : null
  } catch {
    return null
  }
}

export function clearPendingAdd() {
  sessionStorage.removeItem(KEY)
}

export async function processPendingAdd(addToApi: (productId: string) => Promise<void>) {
  const pending = getPendingAdd()
  if (!pending) return null
  clearPendingAdd()
  await addToApi(pending.productId)
  return pending.returnTo || '/cart'
}
