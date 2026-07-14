import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggle: () => void
  init: () => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',

  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('admin_theme', next)
    applyTheme(next)
    set({ theme: next })
  },

  init: () => {
    const saved = (localStorage.getItem('admin_theme') as Theme) || 'dark'
    applyTheme(saved)
    set({ theme: saved })
  },
}))
