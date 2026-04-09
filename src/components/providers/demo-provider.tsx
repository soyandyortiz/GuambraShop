'use client'

import { createContext, useContext } from 'react'

const DemoContext = createContext(false)

export function DemoProvider({
  esDemo,
  children,
}: {
  esDemo: boolean
  children: React.ReactNode
}) {
  return <DemoContext.Provider value={esDemo}>{children}</DemoContext.Provider>
}

export function usarModoDemo() {
  return useContext(DemoContext)
}
