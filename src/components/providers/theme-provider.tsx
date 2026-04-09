'use client'

import * as React from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderContext {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderContext | undefined>(undefined)

export function ThemeProvider({ 
  children,
}: { 
  children: React.ReactNode
}) {
  return (
    <ThemeProviderContext.Provider value={{ theme: 'light', setTheme: () => {} }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
