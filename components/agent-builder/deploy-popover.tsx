'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Rocket,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Globe,
  AlertCircle,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { Agent } from '@/lib/types'

interface DeployPopoverProps {
  agent: Agent
  onAgentUpdate: (updates: Partial<Agent>) => void
}

export function DeployPopover({ agent, onAgentUpdate }: DeployPopoverProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isDeployed = agent.is_deployed && !!agent.deploy_slug
  const publicUrl = isDeployed
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${agent.deploy_slug}`
    : null

  const handleDeploy = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agent.id}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        // Check if this is an auth error
        if (res.status === 401 && data.code === 'REQUIRES_AUTH') {
          // Redirect to signup to create account and claim this agent
          router.push(`/auth/sign-up?next=${encodeURIComponent(`/agent/${agent.id}`)}`)
          return
        }
        setError(data.error ?? 'Deploy failed')
        return
      }
      onAgentUpdate({
        is_deployed: true,
        deploy_slug: data.deploy_slug,
        status: 'deployed',
      })
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsLoading(false)
    }
  }, [agent.id, onAgentUpdate, router])

  const handleUndeploy = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agent.id}/deploy`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        // Check if this is an auth error
        if (res.status === 401 && data.code === 'REQUIRES_AUTH') {
          router.push(`/auth/sign-up?next=${encodeURIComponent(`/agent/${agent.id}`)}`)
          return
        }
        setError(data.error ?? 'Undeploy failed')
        return
      }
      onAgentUpdate({ is_deployed: false, status: 'ready' })
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsLoading(false)
    }
  }, [agent.id, onAgentUpdate, router])

  const handleCopy = useCallback(async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [publicUrl])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={isDeployed ? 'outline' : 'default'}
          className={`gap-1.5 ${isDeployed ? 'border-green-500/40 text-green-600 hover:bg-green-500/5 hover:text-green-700' : ''}`}
        >
          {isDeployed ? (
            <>
              <Globe className="h-3.5 w-3.5" />
              Deployed
            </>
          ) : (
            <>
              <Rocket className="h-3.5 w-3.5" />
              Deploy
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {isDeployed ? (
            <Globe className="h-4 w-4 text-green-500" />
          ) : (
            <Rocket className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {isDeployed ? 'Agent deployed' : 'Deploy agent'}
          </span>
          {isDeployed && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
              Live
            </span>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Not deployed — description */}
          {!isDeployed && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Publish your agent publicly. Anyone with the link can run it — no account required.
            </p>
          )}

          {/* Deployed — URL + controls */}
          {isDeployed && publicUrl && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Share link
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="flex-1 truncate font-mono text-[11px] text-foreground/80">
                    {publicUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded p-1 transition-colors hover:bg-muted"
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded p-1 transition-colors hover:bg-muted"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          {!isDeployed ? (
            <Button
              className="w-full gap-2"
              onClick={handleDeploy}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="h-3.5 w-3.5" />
              )}
              {isLoading ? 'Deploying…' : 'Deploy Agent'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-red-600"
                onClick={handleUndeploy}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Undeploy'}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
