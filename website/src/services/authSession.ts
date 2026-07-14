const ACCESS_KEY = 'marea_customer_token'
const REFRESH_KEY = 'marea_refresh_token'
const CUSTOMER_KEY = 'marea_customer'

type Customer = { id: string; email: string; full_name?: string; phone?: string }

let refreshPromise: Promise<boolean> | null = null
let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpired = cb
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function getSavedCustomer(): Customer | null {
  const raw = localStorage.getItem(CUSTOMER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Customer
  } catch {
    localStorage.removeItem(CUSTOMER_KEY)
    return null
  }
}

export function saveCustomer(customer: Customer) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
}

export function setTokens(accessToken: string | null, refreshToken?: string | null) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
  else localStorage.removeItem(ACCESS_KEY)

  if (refreshToken === undefined) return
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  else localStorage.removeItem(REFRESH_KEY)
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(CUSTOMER_KEY)
}

export function hasStoredSession() {
  return Boolean(getSavedCustomer() && (getAccessToken() || getRefreshToken()))
}

/** Refresh access token using stored refresh token. Dedupes concurrent calls. */
export async function refreshSession(apiBase: string, apiKey: string): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        clearSession()
        onSessionExpired?.()
        return false
      }
      const payload = data.data || data
      setTokens(payload.accessToken, payload.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/** Call after a failed refresh attempt when the caller still got 401. */
export function expireSession() {
  if (!getAccessToken() && !getRefreshToken() && !getSavedCustomer()) return
  clearSession()
  onSessionExpired?.()
}
