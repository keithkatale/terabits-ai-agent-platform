'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type SidebarCollapseContextValue = {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  toggle: () => void
} | null

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>(null)

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true)
  const toggle = useCallback(() => setCollapsed((c) => !c), [])
  return (
    <SidebarCollapseContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarCollapseContext.Provider>
  )
}

export function useSidebarCollapse(): SidebarCollapseContextValue {
  return useContext(SidebarCollapseContext)
}
