'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, CheckCircle2, Loader2, Circle } from 'lucide-react'

type StepStatus = 'pending' | 'running' | 'completed'

interface Step {
  label: string
  status: StepStatus
  detail?: string
}

interface StepsProps {
  title: string
  steps: Step[]
  defaultOpen?: boolean
  className?: string
}

const statusIcons: Record<StepStatus, React.ElementType> = {
  pending: Circle,
  running: Loader2,
  completed: CheckCircle2,
}

export function Steps({ title, steps, defaultOpen = true, className }: StepsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const completedCount = steps.filter((s) => s.status === 'completed').length

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex-1 text-xs font-medium text-foreground">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border px-3 py-2.5">
          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = statusIcons[step.status]
              const isLast = i === steps.length - 1

              return (
                <div key={i} className="flex gap-2.5">
                  {/* Vertical bar */}
                  <div className="flex flex-col items-center">
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 mt-0.5',
                        step.status === 'completed' && 'text-green-600',
                        step.status === 'running' && 'text-primary animate-spin',
                        step.status === 'pending' && 'text-muted-foreground/40'
                      )}
                    />
                    {!isLast && (
                      <div className="mt-1 mb-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className={cn('pb-3', isLast && 'pb-0')}>
                    <p
                      className={cn(
                        'text-xs',
                        step.status === 'completed' && 'text-foreground',
                        step.status === 'running' && 'text-foreground font-medium',
                        step.status === 'pending' && 'text-muted-foreground/60'
                      )}
                    >
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
