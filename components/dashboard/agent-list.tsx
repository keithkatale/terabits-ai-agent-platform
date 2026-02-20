'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Agent } from '@/lib/types'
import { AGENT_CATEGORIES, CONVERSATION_PHASES } from '@/lib/types'

interface AgentListProps {
  agents: Agent[]
}

function getStatusColor(status: string) {
  switch (status) {
    case 'deployed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'ready':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'building':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'draft':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function AgentList({ agents }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">No AI employees yet</h3>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Start a conversation to hire your first AI employee. Just describe the role and we will build it for you.
        </p>
        <Link href="/agent/new" className="mt-6">
          <Button>Hire your first employee</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const category = AGENT_CATEGORIES.find((c) => c.value === agent.category)
        const phase = CONVERSATION_PHASES.find((p) => p.phase === agent.conversation_phase)

        return (
          <Link key={agent.id} href={`/agent/${agent.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
                {category && (
                  <p className="text-xs text-muted-foreground">{category.label}</p>
                )}
              </CardHeader>
              <CardContent>
                {agent.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                )}
                {phase && agent.status !== 'deployed' && agent.status !== 'ready' && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                    {phase.label}: {phase.description}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(agent.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
