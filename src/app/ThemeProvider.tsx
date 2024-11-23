'use client'

import { ThemeProvider as NextThemeProvider } from "next-themes"
import { useState, useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // make sure change theme only after ssr is done. to prevent mismatch hydration.
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemeProvider
      attribute="class" 
      defaultTheme="light"
      disableTransitionOnChange 
    >
      {children}
    </NextThemeProvider>
  )
}