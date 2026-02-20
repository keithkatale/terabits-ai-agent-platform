'use client'

import { cn } from '@/lib/utils'
import { Brain } from 'lucide-react'

interface ThinkingBarProps {
  text?: string
  className?: string
}

export function ThinkingBar({ text = 'Thinking', className }: ThinkingBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-primary/15 bg-primary/5 px-3.5 py-2',
        className
      )}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
      </div>
      <span className="animate-text-shimmer bg-[length:250%_100%] bg-[linear-gradient(90deg,var(--color-muted-foreground)_40%,var(--color-primary)_50%,var(--color-muted-foreground)_60%)] bg-clip-text text-xs font-medium text-transparent">
        {text}...
      </span>
    </div>
  )
}
