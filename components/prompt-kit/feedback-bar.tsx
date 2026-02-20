'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react'

interface FeedbackBarProps {
  messageContent?: string
  className?: string
}

export function FeedbackBar({ messageContent, className }: FeedbackBarProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (messageContent) {
      await navigator.clipboard.writeText(messageContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={handleCopy}
        className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
        aria-label="Copy message"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
      <button
        onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
        className={cn(
          'rounded-md p-1 transition-colors hover:bg-accent',
          feedback === 'up'
            ? 'text-green-600'
            : 'text-muted-foreground/40 hover:text-muted-foreground'
        )}
        aria-label="Helpful"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
        className={cn(
          'rounded-md p-1 transition-colors hover:bg-accent',
          feedback === 'down'
            ? 'text-destructive'
            : 'text-muted-foreground/40 hover:text-muted-foreground'
        )}
        aria-label="Not helpful"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  )
}
