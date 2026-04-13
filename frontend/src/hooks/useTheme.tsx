import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export const THEMES = {
  hud: 'HUD',
  professional: 'Professional',
} as const

export type ThemeKey = keyof typeof THEMES

interface ThemeContextType {
  theme: ThemeKey
  setTheme: (t: ThemeKey) => void
  themeLabel: string
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'pallas-theme'

function applyTheme(theme: ThemeKey) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in THEMES) return stored as ThemeKey
    return 'hud'
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    applyTheme(theme)
  }, [])

  function setTheme(t: ThemeKey) {
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLabel: THEMES[theme] }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme muss innerhalb von ThemeProvider verwendet werden')
  return ctx
}