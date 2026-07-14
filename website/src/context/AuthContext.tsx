import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  api,
  setToken,
  clearSession,
  getSavedCustomer,
  hasStoredSession,
  saveCustomer,
  setOnSessionExpired,
  tryRefreshSession,
  type AuthResponse,
} from '../services/api'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'

interface RegisterResult {
  requiresVerification: boolean
  email?: string
  emailSent?: boolean
}

interface AuthContextValue {
  customer: AuthResponse['customer'] | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; fullName?: string; phone?: string }) => Promise<RegisterResult>
  completeAuth: (data: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<AuthResponse['customer'] | null>(null)
  const [ready, setReady] = useState(false)
  const syncFromApi = useCartStore((s) => s.syncFromApi)
  const setLoggedIn = useCartStore((s) => s.setLoggedIn)
  const syncWishlist = useWishlistStore((s) => s.sync)
  const clearWishlist = useWishlistStore((s) => s.clear)

  const completeAuth = (data: AuthResponse) => {
    setToken(data.token, data.refreshToken ?? null)
    setCustomer(data.customer)
    saveCustomer(data.customer)
    setLoggedIn(true)
  }

  const logout = () => {
    const refreshToken = localStorage.getItem('marea_refresh_token')
    if (refreshToken) void api.logout(refreshToken).catch(() => {})
    clearSession()
    setCustomer(null)
    setLoggedIn(false)
    useCartStore.setState({ apiItems: [] })
    clearWishlist()
    void syncFromApi()
  }

  useEffect(() => {
    setOnSessionExpired(() => {
      setCustomer(null)
      setLoggedIn(false)
      clearWishlist()
    })
    return () => setOnSessionExpired(null)
  }, [setLoggedIn, clearWishlist])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        if (hasStoredSession()) {
          const saved = getSavedCustomer()
          if (saved) {
            setCustomer(saved)
            setLoggedIn(true)
          }

          // Renew access token when a refresh token exists
          if (localStorage.getItem('marea_refresh_token')) {
            await tryRefreshSession()
          }
          if (cancelled) return

          if (!localStorage.getItem('marea_customer_token') && !localStorage.getItem('marea_refresh_token')) {
            setCustomer(null)
            setLoggedIn(false)
            await syncFromApi()
          } else {
            await Promise.all([syncFromApi(), syncWishlist()])
          }
        } else {
          await syncFromApi()
        }
      } catch {
        // stay as guest
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [setLoggedIn, syncFromApi, syncWishlist])

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password })
    completeAuth(res.data)
    await Promise.all([syncFromApi(), syncWishlist()])
  }

  const register = async (data: { email: string; password: string; fullName?: string; phone?: string }) => {
    const res = await api.register(data)
    if ('requiresVerification' in res.data && res.data.requiresVerification) {
      return {
        requiresVerification: true,
        email: res.data.email,
        emailSent: res.data.emailSent !== false,
      }
    }
    completeAuth(res.data as AuthResponse)
    await Promise.all([syncFromApi(), syncWishlist()])
    return { requiresVerification: false }
  }

  return (
    <AuthContext.Provider value={{ customer, ready, login, register, completeAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
