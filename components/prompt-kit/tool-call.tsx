'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Wrench,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { ImageCard } from '@/components/ui/image-card'
import { Markdown } from '@/components/prompt-kit/markdown'

type ToolState = 'pending' | 'running' | 'completed' | 'error'

interface ToolCallProps {
  name: string
  state: ToolState
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  errorText?: string
  defaultOpen?: boolean
  className?: string
}

/** If output is a single string or object with one string value (e.g. result, content, text), return it for Markdown rendering */
function getOutputAsString(output: Record<string, unknown>): string | null {
  if (!output || typeof output !== 'object') return null
  const keys = Object.keys(output)
  if (keys.length === 0) return null
  if (keys.length === 1) {
    const v = output[keys[0]]
    if (typeof v === 'string' && v.trim().length > 0) return v
  }
  const preferred = (output.result ?? output.content ?? output.text ?? output.output) as unknown
  if (typeof preferred === 'string' && preferred.trim().length > 0) return preferred
  return null
}

const stateConfig: Record<
  ToolState,
  { icon: React.ElementType; label: string; colorClass: string }
> = {
  pending: { icon: Clock, label: 'Pending', colorClass: 'text-muted-foreground' },
  running: { icon: Loader2, label: 'Running', colorClass: 'text-primary' },
  completed: { icon: CheckCircle2, label: 'Completed', colorClass: 'text-green-600' },
  error: { icon: AlertCircle, label: 'Error', colorClass: 'text-destructive' },
}

export function ToolCall({
  name,
  state,
  input,
  output,
  errorText,
  defaultOpen = false,
  className,
}: ToolCallProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const config = stateConfig[state]
  const StateIcon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        className
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 text-xs font-medium text-foreground">
          {name}
        </span>
        <StateIcon
          className={cn(
            'h-3.5 w-3.5',
            config.colorClass,
            state === 'running' && 'animate-spin'
          )}
        />
        <span className={cn('text-[10px]', config.colorClass)}>
          {config.label}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border bg-muted/30 px-3 py-2.5 space-y-2">
          {input && Object.keys(input).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Input
              </span>
              <pre className="mt-1 rounded-md bg-background p-2 text-[11px] leading-relaxed text-foreground overflow-x-auto">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output && Object.keys(output).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Output
              </span>
              {name === 'Generate Image' && output.image_url ? (
                <div className="mt-2 max-w-sm">
                  <ImageCard
                    url={output.image_url}
                    prompt={output.prompt || input?.prompt || 'Generated image'}
                    resolution={output.size}
                    showPrompt={true}
                  />
                </div>
              ) : (() => {
                const str = getOutputAsString(output)
                if (str != null) {
                  return (
                    <div className="mt-1 rounded-md bg-background p-2 text-[11px] leading-relaxed text-foreground overflow-x-auto prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-table:text-foreground prose-a:text-primary">
                      <Markdown>{str}</Markdown>
                    </div>
                  )
                }
                return (
                  <pre className="mt-1 rounded-md bg-background p-2 text-[11px] leading-relaxed text-foreground overflow-x-auto">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                )
              })()}
            </div>
          )}
          {errorText && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                Error
              </span>
              <p className="mt-1 text-xs text-destructive">{errorText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
