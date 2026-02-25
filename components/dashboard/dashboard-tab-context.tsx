'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type DashboardTab = 'dashboard' | 'account' | 'settings' | 'connections'

const DashboardTabContext = createContext<{
  currentTab: DashboardTab
  setCurrentTab: (tab: DashboardTab) => void
} | null>(null)

export function useDashboardTab() {
  const ctx = useContext(DashboardTabContext)
  return ctx
}

export function DashboardTabProvider({
  currentTab,
  setCurrentTab,
  children,
}: {
  currentTab: DashboardTab
  setCurrentTab: (tab: DashboardTab) => void
  children: ReactNode
}) {
  return (
    <DashboardTabContext.Provider value={{ currentTab, setCurrentTab }}>
      {children}
    </DashboardTabContext.Provider>
  )
}
