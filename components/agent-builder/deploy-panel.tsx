'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Rocket, Square, ExternalLink, Copy, Check, Loader2 } from 'lucide-react'
import type { Agent } from '@/lib/types'

interface DeployPanelProps {
  agent: Agent
  onAgentUpdate: (agent: Agent) => void
}

export function DeployPanel({ agent, onAgentUpdate }: DeployPanelProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeploy = async () => {
    setIsDeploying(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agent.id}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      onAgentUpdate({
        ...agent,
        is_deployed: true,
        deploy_slug: data.deploy_slug,
        status: 'deployed',
      })
    } catch {
      setError('Failed to deploy')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleUndeploy = async () => {
    setIsDeploying(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agent.id}/deploy`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error)
        return
      }
      onAgentUpdate({
        ...agent,
        is_deployed: false,
        status: 'ready',
      })
    } catch {
      setError('Failed to undeploy')
    } finally {
      setIsDeploying(false)
    }
  }

  const runtimeUrl = agent.deploy_slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/run/${agent.deploy_slug}`
    : null

  const handleCopyUrl = async () => {
    if (!runtimeUrl) return
    await navigator.clipboard.writeText(runtimeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Deployment Status</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {agent.is_deployed
                ? 'Your AI employee is live and accepting requests.'
                : 'Deploy your AI employee to make it available via a unique URL.'}
            </p>
          </div>
          <Badge
            variant={agent.is_deployed ? 'default' : 'secondary'}
            className={agent.is_deployed ? 'bg-emerald-600 text-white' : ''}
          >
            {agent.is_deployed ? 'Live' : 'Offline'}
          </Badge>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {agent.is_deployed ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUndeploy}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                Undeploy
              </Button>
              {runtimeUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/run/${agent.deploy_slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </a>
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleDeploy}
              disabled={isDeploying || !agent.system_prompt}
            >
              {isDeploying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Deploy
            </Button>
          )}
        </div>
      </div>

      {/* Runtime URL */}
      {agent.is_deployed && runtimeUrl && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Runtime URL</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this URL to let anyone interact with your AI employee.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs text-foreground">
              {runtimeUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyUrl}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy URL</span>
            </Button>
          </div>
        </div>
      )}

      {/* System Prompt Preview */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">System Prompt</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The instructions that define your AI employee&apos;s behavior.
        </p>
        {agent.system_prompt ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-input bg-muted p-3 text-xs text-foreground">
            {agent.system_prompt}
          </pre>
        ) : (
          <p className="mt-3 text-xs italic text-muted-foreground">
            No system prompt yet. Complete the building conversation to generate one.
          </p>
        )}
      </div>
    </div>
  )
}
