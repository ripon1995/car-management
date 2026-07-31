import { create } from 'zustand'
import { THEME_STORAGE_KEY } from '../constants/config'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: resolveInitialTheme(),

  setTheme(theme) {
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))

applyTheme(useThemeStore.getState().theme)
