import { Monitor, Moon, Sun } from 'lucide-preact'
import { useState } from 'preact/hooks'

import { getTheme, setTheme, type Theme } from '../utils/theme'

const THEMES = {
  system: { label: 'System', next: 'light', Icon: Monitor },
  light: { label: 'Light', next: 'dark', Icon: Sun },
  dark: { label: 'Dark', next: 'system', Icon: Moon },
} as const satisfies Record<Theme, { label: string; next: Theme; Icon: typeof Monitor }>

/** Cycles the colour theme between system, light and dark. */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const { label, next, Icon } = THEMES[theme]

  const handleClick = () => {
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Theme: ${label}. Switch to ${THEMES[next].label}`}
      title={`Theme: ${label}`}
      className="p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-foreground/10 cursor-pointer transition-colors"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  )
}
