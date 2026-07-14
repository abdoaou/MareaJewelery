import { create } from 'zustand'
import { authApi, clearTokens, setTokens } from '../services/api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER']

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const res = await authApi.login(email, password)
    if (!ADMIN_ROLES.includes(res.data.user.role)) {
      throw new Error('Access denied. Admin account required.')
    }
    setTokens(res.data.accessToken, res.data.refreshToken)
    set({ user: res.data.user })
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      clearTokens()
      set({ user: null })
    }
  },

  fetchUser: async () => {
    try {
      const res = await authApi.me()
      if (!ADMIN_ROLES.includes(res.data.role)) {
        clearTokens()
        set({ user: null, loading: false })
        return
      }
      set({ user: res.data, loading: false })
    } catch {
      clearTokens()
      set({ user: null, loading: false })
    }
  },
}))
