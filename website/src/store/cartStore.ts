import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, type CartItem } from '../services/api'

interface LocalItem {
  productId: string
  name: string
  price: number
  image?: string
  stock: number
  quantity: number
}

interface CartState {
  localItems: LocalItem[]
  apiItems: CartItem[]
  isLoggedIn: boolean
  addLocal: (item: Omit<LocalItem, 'quantity'>) => void
  removeLocal: (productId: string) => void
  updateLocalQty: (productId: string, quantity: number) => void
  clearLocal: () => void
  syncFromApi: (opts?: { silent?: boolean }) => Promise<void>
  addToApi: (productId: string) => Promise<void>
  updateApiQty: (itemId: string, quantity: number) => Promise<void>
  removeApiItem: (itemId: string) => Promise<void>
  clearApiCart: () => Promise<void>
  setLoggedIn: (v: boolean) => void
  totalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      localItems: [],
      apiItems: [],
      isLoggedIn: false,

      addLocal: (item) => {
        const items = get().localItems
        const existing = items.find((i) => i.productId === item.productId)
        if (existing) {
          set({
            localItems: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
                : i,
            ),
          })
        } else {
          set({ localItems: [...items, { ...item, quantity: 1 }] })
        }
      },

      removeLocal: (productId) =>
        set({ localItems: get().localItems.filter((i) => i.productId !== productId) }),

      updateLocalQty: (productId, quantity) => {
        if (quantity <= 0) get().removeLocal(productId)
        else
          set({
            localItems: get().localItems.map((i) =>
              i.productId === productId ? { ...i, quantity } : i,
            ),
          })
      },

      clearLocal: () => set({ localItems: [] }),

      syncFromApi: async (opts) => {
        try {
          const res = await api.getCart(opts)
          set({ apiItems: res.data.items })
        } catch (err) {
          set({ apiItems: [] })
          if (!opts?.silent) throw err
        }
      },

      addToApi: async (productId) => {
        const res = await api.addToCart(productId, 1)
        set({ apiItems: res.data.items })
      },

      updateApiQty: async (itemId, quantity) => {
        if (quantity <= 0) {
          await get().removeApiItem(itemId)
          return
        }
        const res = await api.updateCartItem(itemId, quantity)
        set({ apiItems: res.data.items })
      },

      removeApiItem: async (itemId) => {
        const res = await api.removeCartItem(itemId)
        set({ apiItems: res.data.items })
      },

      clearApiCart: async () => {
        const items = [...get().apiItems]
        await Promise.all(items.map((item) => api.removeCartItem(item.id).catch(() => {})))
        set({ apiItems: [] })
      },

      setLoggedIn: (v) => set({ isLoggedIn: v }),

      totalItems: () => get().apiItems.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'marea-cart', partialize: (s) => ({ localItems: s.localItems }) },
  ),
)
