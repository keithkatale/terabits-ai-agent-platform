'use client'

/**
 * ConnectedAccounts — the "Connect your tools" settings page.
 *
 * Each platform card shows connection status. Clicking "Connect" (or "Reconnect")
 * opens the chat with a pre-filled prompt so the user is guided by the AI using
 * Gemini Computer Use (browser automation) to log in or create an account. When
 * they're logged in, the AI offers to save the session; saving stores encrypted
 * session cookies in Supabase for the agent to reuse.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Platform registry
// ---------------------------------------------------------------------------

interface Platform {
  id: string
  label: string
  description: string
  loginUrl: string
  /** path to an icon in /public or an emoji fallback */
  icon?: string
  iconEmoji?: string
  color: string // tailwind bg class for the icon bg
}

const PLATFORMS: Platform[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Send connection requests, messages, post content, scrape profiles for outreach.',
    loginUrl: 'https://www.linkedin.com/login',
    iconEmoji: '💼',
    color: 'bg-blue-600',
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    description: 'Post tweets, reply to threads, send DMs, monitor mentions.',
    loginUrl: 'https://x.com/login',
    iconEmoji: '𝕏',
    color: 'bg-black',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Post images, reels, manage comments and DMs.',
    loginUrl: 'https://www.instagram.com/accounts/login/',
    iconEmoji: '📸',
    color: 'bg-gradient-to-br from-purple-600 to-pink-500',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Manage pages, post content, run ads, engage with followers.',
    loginUrl: 'https://www.facebook.com/',
    iconEmoji: 'f',
    color: 'bg-blue-700',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    description: 'Post to subreddits, comment, monitor brand mentions.',
    loginUrl: 'https://www.reddit.com/login/',
    iconEmoji: '🤖',
    color: 'bg-orange-600',
  },
  {
    id: 'producthunt',
    label: 'Product Hunt',
    description: 'Submit products, upvote, engage with the community.',
    loginUrl: 'https://www.producthunt.com/login',
    iconEmoji: '🚀',
    color: 'bg-orange-500',
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'Open issues, create PRs, browse repos, manage projects.',
    loginUrl: 'https://github.com/login',
    iconEmoji: '🐙',
    color: 'bg-gray-900',
  },
  {
    id: 'notion',
    label: 'Notion',
    description: 'Read and write pages, manage databases, update documents.',
    loginUrl: 'https://www.notion.so/login',
    iconEmoji: '📝',
    color: 'bg-gray-800',
  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedSession {
  id: string
  platform: string
  platform_label: string
  updated_at: string
  last_used_at: string | null
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CONNECT_PROMPT = (
  platformLabel: string,
) => `Connect my ${platformLabel} account: use browser automation to open ${platformLabel} login and guide me through logging in or creating an account. When I'm logged in, tell me so I can save the session.`

export function ConnectedAccounts() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/browser-sessions')
      if (r.ok) {
        const d = await r.json() as { sessions: SavedSession[] }
        setSessions(d.sessions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  const isConnected = (platformId: string) => sessions.some((s) => s.platform === platformId)

  const handleConnect = (platform: Platform) => {
    const prompt = CONNECT_PROMPT(platform.label)
    router.push(
      `/chat?connect=${encodeURIComponent(platform.id)}&prompt=${encodeURIComponent(prompt)}`
    )
  }

  const handleDisconnect = async (platformId: string) => {
    setDisconnecting(platformId)
    try {
      await fetch(`/api/browser-sessions/${platformId}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.platform !== platformId))
    } finally {
      setDisconnecting(null)
    }
  }

  const connectedCount = sessions.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Connected Accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in to platforms once — the AI agent will reuse your authenticated session to perform tasks on your behalf.
          Your login credentials are <strong>never</strong> stored; only encrypted session cookies are saved.
        </p>
        {connectedCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected
          </p>
        )}
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id)
          const session = sessions.find((s) => s.platform === platform.id)

          return (
            <div
              key={platform.id}
              className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all',
                connected ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/10' : 'border-border'
              )}
            >
              {/* Icon + name + status */}
              <div className="flex items-start gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold', platform.color)}>
                  {platform.icon
                    ? <Image src={platform.icon} alt={platform.label} width={20} height={20} />
                    : platform.iconEmoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{platform.label}</span>
                    {connected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    )}
                  </div>
                  {session && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {session.last_used_at
                        ? `Last used ${new Date(session.last_used_at).toLocaleDateString()}`
                        : `Connected ${new Date(session.updated_at).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{platform.description}</p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto">
                {connected ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => handleConnect(platform)}
                    >
                      <Plus className="h-3 w-3" />
                      Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={disconnecting === platform.id}
                      onClick={() => handleDisconnect(platform.id)}
                    >
                      {disconnecting === platform.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs gap-1"
                    onClick={() => handleConnect(platform)}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
