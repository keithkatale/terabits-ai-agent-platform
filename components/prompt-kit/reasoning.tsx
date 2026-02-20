'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Brain } from 'lucide-react'

interface ReasoningProps {
  children: React.ReactNode
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isStreaming?: boolean
}

export function Reasoning({
  children,
  className,
  open: controlledOpen,
  onOpenChange,
  isStreaming,
}: ReasoningProps) {
  const [internalOpen, setInternalOpen] = useState(true)
  const hasAutoClosedRef = useRef(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value)
    onOpenChange?.(value)
  }

  // Auto-close when streaming ends
  useEffect(() => {
    if (isStreaming === false && !hasAutoClosedRef.current) {
      hasAutoClosedRef.current = true
      const timer = setTimeout(() => setOpen(false), 500)
      return () => clearTimeout(timer)
    }
    if (isStreaming === true) {
      hasAutoClosedRef.current = false
    }
  }, [isStreaming]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('rounded-lg border border-primary/15 bg-primary/5', className)}>
      <button
        onClick={() => setOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-primary/10"
      >
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 text-xs font-medium text-primary">
          {isStreaming ? 'AI is reasoning...' : 'Show reasoning'}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-primary/60 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-primary/10 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
