import { defineStore } from 'pinia'
import { storage } from '@/services/storageService'

/* =========================================================
   Store du thème (clair / sombre / auto)
   ========================================================= */

const THEME_KEY = 'theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: storage.get(THEME_KEY, 'auto'), // 'light' | 'dark' | 'auto'
    systemPreference: 'light'
  }),

  getters: {
    resolvedTheme(state) {
      if (state.theme === 'auto') return state.systemPreference
      return state.theme
    },
    isDark() {
      return this.resolvedTheme === 'dark'
    }
  },

  actions: {
    init() {
      // Détecte la préférence système
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      this.systemPreference = mq.matches ? 'dark' : 'light'
      mq.addEventListener('change', (e) => {
        this.systemPreference = e.matches ? 'dark' : 'light'
        this.applyTheme()
      })
      this.applyTheme()
    },

    setTheme(theme) {
      if (!['light', 'dark', 'auto'].includes(theme)) return
      this.theme = theme
      storage.set(THEME_KEY, theme)
      this.applyTheme()
    },

    toggle() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
    },

    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme)
    }
  }
})
