'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/agent-builder/chat-panel'
import { InstructionsPanel } from '@/components/agent-builder/instructions-panel'
import { AgentExecutionView } from '@/components/agent-builder/agent-execution-view'
import { DeployPopover } from '@/components/agent-builder/deploy-popover'
import { ArrowLeft, Play } from 'lucide-react'
import type { Agent } from '@/lib/types'

interface AgentBuilderProps {
  agent: Agent
}

export function AgentBuilder({ agent: initialAgent }: AgentBuilderProps) {
  const [currentAgent, setCurrentAgent] = useState(initialAgent)
  const [isRunning, setIsRunning] = useState(false)

  const handleAgentUpdate = useCallback((updates: Partial<Agent>) => {
    setCurrentAgent((prev) => ({ ...prev, ...updates }))
  }, [])

  const isReady = currentAgent.status === 'ready' || currentAgent.conversation_phase === 'complete'
  const hasInstructions = !!currentAgent.instruction_prompt

  // Agents with inputFields have a manual trigger — users run them directly from the
  // Preview panel. The header "Run Agent" button is only for agents without a manual
  // trigger (e.g. scheduled / automated), or to switch into full-screen execution mode.
  const executionContext = currentAgent.execution_context as {
    triggerConfig?: { inputFields?: unknown[] }
  } | undefined
  const hasManualTrigger = (executionContext?.triggerConfig?.inputFields?.length ?? 0) > 0

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Image
              src="/icon-nobg.svg"
              alt="Terabits"
              width={24}
              height={24}
              priority
              className="h-6 w-6"
            />
            <span className="text-sm font-medium text-foreground">{currentAgent.name}</span>
          </div>
          {isReady && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
              Ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Only show "Run Agent" for agents without a manual trigger (no inputFields).
              Agents with inputFields can be run directly from the Preview panel. */}
          {isReady && !hasManualTrigger && !isRunning && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setIsRunning(true)}
            >
              <Play className="h-3.5 w-3.5" />
              Run Agent
            </Button>
          )}
          {isRunning && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsRunning(false)}
            >
              Back to Builder
            </Button>
          )}
          {/* Deploy / share — visible once agent has instructions */}
          {hasInstructions && !isRunning && (
            <DeployPopover agent={currentAgent} onAgentUpdate={handleAgentUpdate} />
          )}
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {!isRunning ? (
          <>
            {/* Chat panel — full width until instructions exist, then 40% */}
            <div
              className={`flex flex-col border-r border-border transition-all duration-500 ease-in-out ${
                hasInstructions ? 'w-[40%] min-w-[320px] max-w-[560px]' : 'w-full'
              }`}
            >
              <ChatPanel
                agent={currentAgent}
                onAgentUpdate={handleAgentUpdate}
                isFullWidth={!hasInstructions}
              />
            </div>

            {/* Instructions / execution panel — slides in when instructions are saved */}
            {hasInstructions && (
              <div className="flex-1 overflow-hidden">
                <InstructionsPanel agent={currentAgent} />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Full-screen execution mode (for non-manual-trigger agents) */}
            <div className="flex w-[40%] min-w-[320px] flex-col border-r border-border">
              <ChatPanel
                agent={currentAgent}
                onAgentUpdate={handleAgentUpdate}
                isFullWidth={false}
              />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <AgentExecutionView
                agent={currentAgent}
                isRunning={isRunning}
                onStop={() => setIsRunning(false)}
                triggerConfig={(currentAgent.execution_context as any)?.triggerConfig}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
