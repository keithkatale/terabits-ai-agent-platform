'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

/**
 * Thin progress bar at the top of the viewport that shows when the route is changing.
 * Gives immediate feedback during navigation.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 400)
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20 transition-opacity duration-150 pt-safe"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: '30%',
          animation: visible ? 'navigation-progress-shimmer 0.5s ease-out' : 'none',
        }}
      />
    </div>
  )
}
