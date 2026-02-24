'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

type SetHeaderTitle = (title: string | null) => void

const HeaderTitleContext = createContext<{ title: string | null; setTitle: SetHeaderTitle } | null>(null)

export function HeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null)
  return (
    <HeaderTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </HeaderTitleContext.Provider>
  )
}

export function useHeaderTitle() {
  const ctx = useContext(HeaderTitleContext)
  return ctx ?? { title: null, setTitle: (_: string | null) => {} }
}
