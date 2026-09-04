import { api } from '../services/api'

const PENDING_SPIN_KEY = 'marea_wheel_pending_spin_id'

/** Best-effort cart, wishlist, and wheel claim after login — one request at a time. */
export async function postAuthSync(deps: {
  syncFromApi: (opts?: { silent?: boolean }) => Promise<void>
  syncWishlist: (opts?: { silent?: boolean }) => Promise<void>
}) {
  try {
    await deps.syncFromApi({ silent: true })
  } catch {
    // background sync
  }

  try {
    await deps.syncWishlist({ silent: true })
  } catch {
    // background sync
  }

  const spinId = localStorage.getItem(PENDING_SPIN_KEY)
  if (!spinId) return

  try {
    await api.claimWheel(spinId, { silent: true })
    localStorage.removeItem(PENDING_SPIN_KEY)
  } catch {
    // keep spin id for a later retry
  }
}
