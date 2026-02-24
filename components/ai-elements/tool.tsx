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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ImageCard } from '@/components/ui/image-card'
import { Markdown } from '@/components/ai-elements/markdown'

export type ToolState = 'pending' | 'running' | 'completed' | 'error'

/** Maps our state to AI Elements-style state for badges */
export function getStatusBadgeState(
  state: ToolState
): 'input-streaming' | 'input-available' | 'output-available' | 'output-error' {
  switch (state) {
    case 'pending':
      return 'input-streaming'
    case 'running':
      return 'input-available'
    case 'completed':
      return 'output-available'
    case 'error':
      return 'output-error'
    default:
      return 'input-streaming'
  }
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

export interface ToolCallProps {
  /** Tool name (display label) */
  name: string
  state: ToolState
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  errorText?: string
  defaultOpen?: boolean
  className?: string
}

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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function ToolOutputContent({
  name,
  input,
  output,
  errorText,
}: {
  name: string
  input?: Record<string, unknown>
  output: Record<string, unknown>
  errorText?: string
}) {
  if (!isPlainObject(output)) return null
  try {
    if (name === 'Generate Image' && output.image_url) {
      return (
        <div className="mt-2 max-w-sm">
          <ImageCard
            url={output.image_url as string}
            prompt={(output.prompt || (input as Record<string, unknown>)?.prompt || 'Generated image') as string}
            resolution={output.size as string}
            showPrompt={true}
          />
        </div>
      )
    }
    const steps = output.steps as Array<{
      stepIndex?: number
      action?: string
      screenshotBase64?: string | null
      success?: boolean
      error?: string
    }> | undefined
    if (Array.isArray(steps) && steps.some((s) => s?.screenshotBase64 || s?.action)) {
      return (
        <div className="mt-2 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-md border border-border bg-background overflow-hidden">
              <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground flex items-center gap-2">
                <span>Step {((s?.stepIndex ?? i) + 1)}</span>
                <span className="text-foreground">{s?.action ?? '—'}</span>
                {s?.success === false && s?.error && (
                  <span className="text-destructive truncate">{s.error}</span>
                )}
              </div>
              {s?.screenshotBase64 && (
                <div className="border-t border-border p-1">
                  <img
                    src={`data:image/png;base64,${s.screenshotBase64}`}
                    alt={`After ${s?.action ?? 'step'}`}
                    className="max-w-full h-auto rounded max-h-64 object-contain bg-muted"
                  />
                </div>
              )}
            </div>
          ))}
          {output.success === false && output.error && (
            <p className="text-xs text-destructive">{String(output.error)}</p>
          )}
        </div>
      )
    }
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
  } catch (err) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[Tool] ToolOutputContent render error:', err)
    }
    return (
      <p className="text-xs text-muted-foreground">
        {errorText ?? 'Output could not be displayed'}
      </p>
    )
  }
}

/**
 * AI Elements-style Tool: collapsible tool invocation with header, input, and output.
 * Accepts name, state, input, output, and optional errorText.
 */
export function Tool({
  name,
  state,
  input,
  output,
  errorText,
  defaultOpen = false,
  className,
}: ToolCallProps) {
  const [open, setOpen] = useState(defaultOpen)
  const config = stateConfig[state]
  const StateIcon = config.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'rounded-lg border border-border bg-card overflow-hidden',
          className
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50">
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
              open && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border bg-muted/30 px-3 py-2.5 space-y-2">
            {input != null && isPlainObject(input) && Object.keys(input).length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Input
                </span>
                <pre className="mt-1 rounded-md bg-background p-2 text-[11px] leading-relaxed text-foreground overflow-x-auto">
                  {JSON.stringify(input, null, 2)}
                </pre>
              </div>
            )}
            {output != null && isPlainObject(output) && Object.keys(output).length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Output
                </span>
                <ToolOutputContent
                  name={name}
                  input={input}
                  output={output}
                  errorText={errorText}
                />
              </div>
            )}
            {errorText && !(output != null && isPlainObject(output) && Object.keys(output).length > 0) && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  Error
                </span>
                <p className="mt-1 text-xs text-destructive">{errorText}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
