'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/agent-builder/chat-panel'
import { DeployPopover } from '@/components/agent-builder/deploy-popover'
import { TemplateSelect } from '@/components/agent-builder/template-select'
import { AgentExecutionProvider } from '@/components/agent-builder/agent-execution-context'
import { AgentEmbeddedFormExecution } from '@/components/agent-builder/agent-embedded-form-execution'
import { AgentConfigPanel } from '@/components/agent-builder/agent-config-panel'
import { DashboardChatSidebar } from '@/components/dashboard/dashboard-chat-sidebar'
import { useSidebarInLayout } from '@/components/dashboard/sidebar-in-layout-context'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent, Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface AgentBuilderProps {
  agent: Agent
  user?: User | null
  profile?: Profile | null
}

export function AgentBuilder({ agent: initialAgent, user, profile }: AgentBuilderProps) {
  const [currentAgent, setCurrentAgent] = useState(initialAgent)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarInLayout = useSidebarInLayout()

  const handleAgentUpdate = useCallback((updates: Partial<Agent>) => {
    setCurrentAgent((prev) => ({ ...prev, ...updates }))
  }, [])

  const isReady = currentAgent.status === 'ready' || currentAgent.conversation_phase === 'complete'
  const hasInstructions = !!currentAgent.instruction_prompt
  const showThreeColumn = hasInstructions && user != null && profile != null
  const showLeftSidebarInBuilder = showThreeColumn && !sidebarInLayout

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Minimal top strip: agent name, Ready, Template, Deploy, Dashboard */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{currentAgent.name}</span>
          {isReady && (
            <span className="rounded-lg bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
              Ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TemplateSelect agent={currentAgent} onAgentUpdate={handleAgentUpdate} />
          {hasInstructions && (
            <DeployPopover agent={currentAgent} onAgentUpdate={handleAgentUpdate} />
          )}
          <Link href="/agent">
            <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Layout: collapsible sidebar (when not in layout) | main (form + execution or chat) | config */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — only when not already rendered by layout */}
        {showLeftSidebarInBuilder && (
          <div
            className={cn(
              'hidden shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 ease-out md:flex',
              sidebarCollapsed ? 'w-14' : 'w-[260px]'
            )}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="flex h-10 w-full items-center justify-center border-b border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            {!sidebarCollapsed && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <DashboardChatSidebar user={user} profile={profile} />
              </div>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 overflow-hidden">
          {hasInstructions ? (
            <AgentExecutionProvider agent={currentAgent}>
              {/* Middle: embedded form and execution only (no chat) */}
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-col border-r border-border transition-all duration-300',
                  showThreeColumn ? 'max-w-[520px]' : ''
                )}
              >
                <AgentEmbeddedFormExecution agent={currentAgent} />
              </div>

              {/* Right: tools and configuration — grows to use available space */}
              <div className="flex min-w-[320px] flex-1 overflow-hidden bg-card/50">
                <AgentConfigPanel agent={currentAgent} onAgentUpdate={handleAgentUpdate} />
              </div>
            </AgentExecutionProvider>
          ) : (
            <div className="flex w-full flex-col">
              <ChatPanel
                agent={currentAgent}
                onAgentUpdate={handleAgentUpdate}
                isFullWidth
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
