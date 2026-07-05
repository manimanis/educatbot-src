import { useThemeStore } from '@/stores/theme'

/**
 * Composable pour gérer le thème.
 */
export function useTheme() {
  const themeStore = useThemeStore()

  return {
    theme: themeStore.theme,
    setTheme: themeStore.setTheme,
    toggle: themeStore.toggle,
    isDark: themeStore.isDark,
    init: themeStore.init
  }
}
