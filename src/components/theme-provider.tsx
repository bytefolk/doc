'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

function SharedThemeAttribute() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      document.documentElement.dataset.theme = resolvedTheme
    }
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <SharedThemeAttribute />
      {children}
    </NextThemesProvider>
  )
}
