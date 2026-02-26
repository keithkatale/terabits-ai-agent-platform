'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import type { Agent } from '@/lib/types'
import { AGENT_CATEGORIES, CONVERSATION_PHASES } from '@/lib/types'

interface AgentListProps {
  agents: Agent[]
}

function getStatusColor(status: string) {
  switch (status) {
    case 'deployed':
      return 'bg-green-100 text-green-800'
    case 'ready':
      return 'bg-blue-100 text-blue-800'
    case 'building':
      return 'bg-amber-100 text-amber-800'
    case 'draft':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function AgentList({ agents }: AgentListProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent, agent: Agent) => {
    e.preventDefault()
    e.stopPropagation()
    setAgentToDelete(agent)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/agents/${agentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete agent')
      }

      setDeleteDialogOpen(false)
      setAgentToDelete(null)
      router.refresh()
    } catch (error) {
      console.error('Error deleting agent:', error)
      // TODO: Show error toast
    } finally {
      setIsDeleting(false)
    }
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">No sub-agents yet</h3>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Create a sub-agent from the Assistant by describing a repetitive task, or build one here.
        </p>
        <Link href="/agent/new" className="mt-6">
          <Button>New sub-agent</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const category = AGENT_CATEGORIES.find((c) => c.value === agent.category)
          const phase = CONVERSATION_PHASES.find((p) => p.phase === agent.conversation_phase)

          return (
            <div key={agent.id} className="group relative">
              <Link href={`/agent/${agent.slug ?? agent.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base pr-8">{agent.name}</CardTitle>
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
              
              {/* Delete button - appears on hover */}
              <button
                onClick={(e) => handleDeleteClick(e, agent)}
                className="absolute right-2 top-2 z-10 rounded-lg bg-background/80 p-2 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                aria-label="Delete agent"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sub-agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
              All configuration, skills, and conversation history for this sub-agent will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
