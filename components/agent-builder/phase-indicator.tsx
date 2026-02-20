import { CONVERSATION_PHASES } from '@/lib/types'
import type { Agent } from '@/lib/types'

interface PhaseIndicatorProps {
  phase: Agent['conversation_phase']
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const currentIndex = CONVERSATION_PHASES.findIndex((p) => p.phase === phase)
  const currentPhase = CONVERSATION_PHASES[currentIndex]

  if (!currentPhase) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {CONVERSATION_PHASES.map((p, i) => (
          <div
            key={p.phase}
            className={`h-1.5 w-5 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-primary' : 'bg-border'
            }`}
            title={p.label}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{currentPhase.label}</span>
    </div>
  )
}
