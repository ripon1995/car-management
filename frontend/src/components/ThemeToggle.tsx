import { useThemeStore } from '../store/themeStore'
import { MoonIcon, SunIcon } from './NavIcons'

function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="app-header-theme-toggle"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export default ThemeToggle
