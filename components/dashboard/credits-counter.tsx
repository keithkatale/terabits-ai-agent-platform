'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface CreditsCounterProps {
  onCounterClick?: () => void
}

export function CreditsCounter({ onCounterClick }: CreditsCounterProps) {
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/user/credits')
      if (response.ok) {
        const data = await response.json()
        setCredits(data.balance?.balance ?? 0)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={onCounterClick}
      className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
      title="Click to view account details"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <span>{credits !== null ? credits.toLocaleString() : '—'}</span>
        </>
      )}
    </button>
  )
}
