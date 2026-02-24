'use client'

import { createContext, useContext, type ReactNode } from 'react'

const SidebarInLayoutContext = createContext<boolean>(false)

export function SidebarInLayoutProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return (
    <SidebarInLayoutContext.Provider value={value}>
      {children}
    </SidebarInLayoutContext.Provider>
  )
}

export function useSidebarInLayout(): boolean {
  return useContext(SidebarInLayoutContext)
}
