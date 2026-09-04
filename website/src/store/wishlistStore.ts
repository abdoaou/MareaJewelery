import { create } from 'zustand'
import { api, type LikedItem } from '../services/api'

interface WishlistState {
  likedIds: string[]
  items: LikedItem[]
  loaded: boolean
  pending: Record<string, boolean>
  sync: (opts?: { silent?: boolean }) => Promise<void>
  toggle: (productId: string) => Promise<boolean>
  isLiked: (productId: string) => boolean
  clear: () => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  likedIds: [],
  items: [],
  loaded: false,
  pending: {},

  sync: async (opts) => {
    try {
      const listRes = await api.getWishlist(opts)
      set({
        likedIds: listRes.data.map((item) => item.productId),
        items: listRes.data,
        loaded: true,
      })
    } catch (err) {
      set({ likedIds: [], items: [], loaded: true })
      if (!opts?.silent) throw err
    }
  },

  toggle: async (productId) => {
    if (get().pending[productId]) {
      return get().likedIds.includes(productId)
    }

    const prevIds = get().likedIds
    const prevItems = get().items
    const wasLiked = prevIds.includes(productId)
    const nextLiked = !wasLiked

    // Instant UI — don't wait for remote Supabase
    set({
      pending: { ...get().pending, [productId]: true },
      likedIds: nextLiked
        ? Array.from(new Set([...prevIds, productId]))
        : prevIds.filter((id) => id !== productId),
      items: nextLiked ? prevItems : prevItems.filter((item) => item.productId !== productId),
    })

    try {
      const res = await api.toggleWishlist(productId)
      const liked = res.data.liked
      if (liked !== nextLiked) {
        set((state) => ({
          likedIds: liked
            ? Array.from(new Set([...state.likedIds, productId]))
            : state.likedIds.filter((id) => id !== productId),
        }))
      }
      return liked
    } catch (err) {
      set({ likedIds: prevIds, items: prevItems })
      throw err
    } finally {
      const pending = { ...get().pending }
      delete pending[productId]
      set({ pending })
    }
  },

  isLiked: (productId) => get().likedIds.includes(productId),

  clear: () => set({ likedIds: [], items: [], loaded: false, pending: {} }),
}))
