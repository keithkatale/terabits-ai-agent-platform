'use client'

/**
 * BrowserPanel — live browser view for Terabits AI.
 *
 * Transport: SSE stream (/api/browser/session/:id/stream) pushes JPEG frames
 * at 300ms whenever the page changes — much faster than polling.
 *
 * Interaction: click/type/key/scroll events are forwarded to the worker via
 * /api/browser/session/:id/interact. Clicks are translated from display
 * coordinates to true browser coordinates (1280×720).
 *
 * Session save: calls /api/browser-sessions (POST) to encrypt + persist the
 * Playwright storageState to Supabase after a user completes login.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react'
import { cn } from '@/lib/utils'
import {
  Globe,
  Hand,
  Keyboard,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
  Save,
  Shield,
  Smartphone,
  Tablet,
  WifiOff,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrowserPanelMode = 'viewing' | 'interacting' | 'human-handoff'
export type BrowserViewport = 'desktop' | 'tablet' | 'mobile'

interface BrowserPanelState {
  sessionId: string | null
  frameBase64: string | null       // latest JPEG frame from SSE stream
  currentUrl: string
  isConnected: boolean             // SSE connection alive
  isLoading: boolean               // waiting for first frame
  mode: BrowserPanelMode
  viewport: BrowserViewport
  isFullscreen: boolean
  error: string | null
}

interface BrowserPanelContextValue extends BrowserPanelState {
  /** When set (e.g. from browser_automation tool result), display this instead of stream. Updates live with each tool call. */
  overrideFrameBase64: string | null
  /** Effective frame to show: override from tool result or stream frame */
  effectiveFrameBase64: string | null
  setMode: (m: BrowserPanelMode) => void
  setViewport: (v: BrowserViewport) => void
  toggleFullscreen: () => void
  navigateTo: (url: string) => Promise<void>
  sendInteraction: (action: InteractionPayload) => Promise<void>
  saveSession: (opts: SaveSessionOpts) => Promise<void>
  isSaving: boolean
}

type InteractionPayload =
  | { action: 'click'; x: number; y: number }
  | { action: 'type'; text: string }
  | { action: 'key'; key: string }
  | { action: 'navigate'; url: string }
  | { action: 'scroll'; x: number; y: number }

interface SaveSessionOpts {
  platform: string
  platformLabel: string
  platformUrl: string
  onSaved?: () => void
}

const BrowserPanelContext = createContext<BrowserPanelContextValue | null>(null)

export function useBrowserPanel() {
  const ctx = useContext(BrowserPanelContext)
  if (!ctx) throw new Error('useBrowserPanel must be inside <BrowserPanel>')
  return ctx
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIEWPORT_WIDTHS: Record<BrowserViewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
}

// True browser dimensions from the worker
const BROWSER_W = 1280
const BROWSER_H = 720

// Module-level token cache — issued once per session open, reused for all calls.
// Avoids a Supabase round-trip on every click/keypress.
let _proxyToken: string | null = null
async function getProxyToken(): Promise<string | null> {
  if (_proxyToken) return _proxyToken
  try {
    const r = await fetch('/api/browser/token', { method: 'POST' })
    if (!r.ok) return null
    const d = await r.json() as { token?: string }
    _proxyToken = d.token ?? null
    // Expire token after 55 minutes (server-side TTL is 60min)
    setTimeout(() => { _proxyToken = null }, 55 * 60 * 1000)
    return _proxyToken
  } catch { return null }
}

async function apiPost(path: string, body: object): Promise<unknown> {
  const token = await getProxyToken()
  const r = await fetch(`/api/browser/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-browser-token': token } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((err.error as string) || `HTTP ${r.status}`)
  }
  return r.json()
}

// ---------------------------------------------------------------------------
// Root Provider
// ---------------------------------------------------------------------------

export interface BrowserPanelProps {
  sessionId: string | null
  /** When set, this frame is shown instead of the SSE stream (e.g. latest screenshot from browser_automation). */
  overrideFrameBase64?: string | null
  className?: string
  children?: React.ReactNode
}

export function BrowserPanel({ sessionId, overrideFrameBase64 = null, className, children }: BrowserPanelProps): React.JSX.Element {
  const [state, setState] = useState<BrowserPanelState>({
    sessionId,
    frameBase64: null,
    currentUrl: '',
    isConnected: false,
    isLoading: !!sessionId,
    mode: 'viewing',
    viewport: 'desktop',
    isFullscreen: false,
    error: null,
  })
  const [isSaving, setIsSaving] = useState(false)
  const effectiveFrameBase64 = overrideFrameBase64 ?? state.frameBase64

  const esRef = useRef<EventSource | null>(null)

  // Connect SSE stream when sessionId changes
  useEffect(() => {
    setState((s) => ({ ...s, sessionId, frameBase64: null, isLoading: !!sessionId, isConnected: false, error: null }))

    if (esRef.current) { esRef.current.close(); esRef.current = null }
    if (!sessionId) return

    let cancelled = false

    // Issue / reuse a proxy token, then open SSE stream
    // (EventSource can't set custom headers, so the token goes in ?token=)
    getProxyToken().then((token) => {
      if (cancelled) return
      const url = token
        ? `/api/browser/session/${sessionId}/stream?token=${encodeURIComponent(token)}`
        : `/api/browser/session/${sessionId}/stream`
      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => setState((s) => ({ ...s, isConnected: true, isLoading: true, error: null }))
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as { type: string; screenshotBase64?: string; url?: string }
          if (data.type === 'frame') {
            setState((s) => ({ ...s, frameBase64: data.screenshotBase64 ?? s.frameBase64, currentUrl: data.url ?? s.currentUrl, isLoading: false }))
          } else if (data.type === 'session_closed') {
            setState((s) => ({ ...s, isConnected: false, error: 'Session ended.' }))
          }
        } catch { /* malformed frame */ }
      }
      es.onerror = () => setState((s) => ({ ...s, isConnected: false, isLoading: false }))
    })

    return () => {
      cancelled = true
      if (esRef.current) { esRef.current.close(); esRef.current = null }
    }
  }, [sessionId])

  const sendInteraction = useCallback(async (payload: InteractionPayload) => {
    const sid = state.sessionId
    if (!sid) return
    try {
      await apiPost(`session/${sid}/interact`, payload)
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
    }
  }, [state.sessionId])

  const navigateTo = useCallback(async (url: string) => {
    let u = url.trim()
    if (u && !u.startsWith('http')) u = `https://${u}`
    await sendInteraction({ action: 'navigate', url: u })
  }, [sendInteraction])

  const saveSession = useCallback(async ({ platform, platformLabel, platformUrl, onSaved }: SaveSessionOpts) => {
    if (!state.sessionId) return
    setIsSaving(true)
    try {
      const r = await fetch('/api/browser-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          platform,
          platformLabel,
          platformUrl,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as Record<string, unknown>
        throw new Error((err.error as string) || `HTTP ${r.status}`)
      }
      onSaved?.()
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
    } finally {
      setIsSaving(false)
    }
  }, [state.sessionId])

  const ctx: BrowserPanelContextValue = {
    ...state,
    overrideFrameBase64: overrideFrameBase64 ?? null,
    effectiveFrameBase64,
    isSaving,
    setMode: (mode) => setState((s) => ({ ...s, mode })),
    setViewport: (viewport) => setState((s) => ({ ...s, viewport })),
    toggleFullscreen: () => setState((s) => ({ ...s, isFullscreen: !s.isFullscreen })),
    navigateTo,
    sendInteraction,
    saveSession,
  }

  return (
    <BrowserPanelContext.Provider value={ctx}>
      <TooltipProvider>
        <div
          className={cn(
            'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm',
            state.isFullscreen && 'fixed inset-0 z-50 rounded-none border-0 shadow-none',
            className
          )}
        >
          {children}
        </div>
      </TooltipProvider>
    </BrowserPanelContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Navigation Bar
// ---------------------------------------------------------------------------

export function BrowserPanelNavigation({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-2 border-b border-border bg-muted/40', className)} {...props}>
      {children}
    </div>
  )
}

export function BrowserPanelNavButton({
  tooltip, className, ...props
}: React.ComponentProps<typeof Button> & { tooltip?: string }) {
  const btn = <Button size="icon" variant="ghost" className={cn('h-7 w-7 shrink-0', className)} {...props} />
  if (!tooltip) return btn
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function BrowserPanelUrl({ className, ...props }: React.ComponentProps<typeof Input>) {
  const { currentUrl, navigateTo } = useBrowserPanel()
  const [draft, setDraft] = useState(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(currentUrl)
  }, [currentUrl])

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { navigateTo(draft); inputRef.current?.blur() }
        if (e.key === 'Escape') { setDraft(currentUrl); inputRef.current?.blur() }
      }}
      onFocus={(e) => e.target.select()}
      placeholder="Enter URL…"
      className={cn('h-7 flex-1 rounded-full px-3 text-xs font-mono bg-background/60 focus-visible:ring-1', className)}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  )
}

export function BrowserPanelViewportSelector({ className }: { className?: string }) {
  const { viewport, setViewport } = useBrowserPanel()
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {([
        ['desktop', <Monitor key="d" className="h-3.5 w-3.5" />, 'Desktop'],
        ['tablet', <Tablet key="t" className="h-3.5 w-3.5" />, 'Tablet'],
        ['mobile', <Smartphone key="m" className="h-3.5 w-3.5" />, 'Mobile'],
      ] as [BrowserViewport, React.ReactNode, string][]).map(([v, icon, label]) => (
        <Tooltip key={v}>
          <TooltipTrigger asChild>
            <Button size="icon" variant={viewport === v ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => setViewport(v)}>
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

export function BrowserPanelModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useBrowserPanel()
  const active = mode === 'interacting'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={active ? 'default' : 'ghost'}
          className={cn('h-7 w-7', className)}
          onClick={() => setMode(active ? 'viewing' : 'interacting')}
        >
          <Hand className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{active ? 'Stop interacting' : 'Click to interact'}</TooltipContent>
    </Tooltip>
  )
}

export function BrowserPanelFullscreenButton({ className }: { className?: string }) {
  const { isFullscreen, toggleFullscreen } = useBrowserPanel()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" className={cn('h-7 w-7', className)} onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Human-Handoff Banner
// ---------------------------------------------------------------------------

export function BrowserPanelHandoffBanner({ className }: { className?: string }) {
  const { mode, setMode } = useBrowserPanel()
  if (mode !== 'human-handoff') return null
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 bg-amber-50/80 border-b border-amber-200', className)}>
      <Shield className="h-4 w-4 text-amber-700 shrink-0" />
      <p className="flex-1 text-xs text-amber-800">
        The agent needs you to complete this step — log in or solve the CAPTCHA, then click <strong>Done</strong>.
      </p>
      <Button size="sm" className="h-6 px-2.5 text-xs" onClick={() => setMode('viewing')}>Done</Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Body — renders the live frame on a <canvas> with interaction forwarding
// ---------------------------------------------------------------------------

export function BrowserPanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const {
    effectiveFrameBase64, isLoading, isConnected, mode, viewport, sessionId, error, sendInteraction, overrideFrameBase64,
  } = useBrowserPanel()
  const frameBase64 = effectiveFrameBase64

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [typingMode, setTypingMode] = useState(false)
  const [typeBuffer, setTypeBuffer] = useState('')

  // Translate click on the displayed <img> to real 1280×720 browser coords
  const handleImgClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (mode === 'viewing') return
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) * (BROWSER_W / rect.width))
    const y = Math.round((e.clientY - rect.top) * (BROWSER_H / rect.height))
    sendInteraction({ action: 'click', x, y })
  }, [mode, sendInteraction])

  // Global keyboard listener when panel is focused in interact mode
  useEffect(() => {
    if (mode !== 'interacting') return
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      sendInteraction({ action: 'key', key: e.key })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, sendInteraction])

  const handleScroll = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (mode === 'viewing') return
    e.preventDefault()
    sendInteraction({ action: 'scroll', x: e.deltaX, y: e.deltaY })
  }, [mode, sendInteraction])

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeBuffer) { sendInteraction({ action: 'type', text: typeBuffer }); setTypeBuffer('') }
    setTypingMode(false)
  }

  const viewportWidth = VIEWPORT_WIDTHS[viewport]

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 min-h-0 overflow-auto flex items-start justify-center bg-muted/30 relative select-none', className)}
      onWheel={handleScroll}
      {...props}
    >
      <div
        className="relative overflow-hidden bg-white transition-all duration-300"
        style={{ width: viewportWidth, maxWidth: '100%', minHeight: '300px' }}
      >
        {/* Empty state */}
        {!sessionId && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Globe className="h-8 w-8 opacity-30" />
            <p className="text-sm">No active browser session</p>
          </div>
        )}

        {/* Connecting / loading first frame */}
        {sessionId && isLoading && !frameBase64 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin opacity-40" />
            <p className="text-xs">Connecting to browser…</p>
          </div>
        )}

        {/* Disconnected */}
        {sessionId && !isConnected && !isLoading && !frameBase64 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <WifiOff className="h-6 w-6 opacity-30" />
            <p className="text-xs">Stream disconnected — reconnecting…</p>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="absolute top-2 inset-x-2 z-10 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Live frame */}
        {frameBase64 && (
          <>
            {/* Thin progress bar while loading new frame */}
            {isLoading && (
              <div className="absolute top-0 inset-x-0 h-0.5 z-20 bg-primary/20 overflow-hidden">
                <div className="h-full w-1/3 bg-primary animate-[browser-progress_1s_ease-in-out_infinite]" />
              </div>
            )}

            {/* Live indicator: stream connected and no override, or show "Tool update" when override */}
            {overrideFrameBase64 ? (
              <div className="absolute top-2 right-2 z-10 rounded bg-muted/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Latest from AI
              </div>
            ) : isConnected ? (
              <div className="absolute top-2 right-2 z-10">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            ) : null}

            <img
              ref={imgRef}
              src={overrideFrameBase64 ? `data:image/png;base64,${frameBase64}` : `data:image/jpeg;base64,${frameBase64}`}
              alt="Live browser view"
              width={BROWSER_W}
              height={BROWSER_H}
              className={cn(
                'block w-full h-auto',
                mode !== 'viewing' ? 'cursor-pointer' : 'cursor-default'
              )}
              onClick={handleImgClick}
              draggable={false}
            />

            {/* Interact mode controls */}
            {mode === 'interacting' && (
              <div className="absolute bottom-2 left-2 flex gap-1.5 z-10">
                <Badge variant="secondary" className="text-[10px] gap-1 py-0.5">
                  <Hand className="h-3 w-3" />
                  Interact — click anywhere
                </Badge>
                <Button
                  size="sm" variant="secondary"
                  className="h-5 px-2 text-[10px] gap-1"
                  onClick={() => setTypingMode(true)}
                >
                  <Keyboard className="h-3 w-3" />
                  Type
                </Button>
              </div>
            )}

            {/* Human-handoff amber border */}
            {mode === 'human-handoff' && (
              <div className="absolute inset-0 border-2 border-amber-400 pointer-events-none rounded-sm" />
            )}
          </>
        )}
      </div>

      {/* Typing overlay */}
      {typingMode && (
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-6 bg-black/30 backdrop-blur-sm">
          <form
            onSubmit={handleTypeSubmit}
            className="flex items-center gap-2 rounded-xl border border-border bg-background shadow-xl px-3 py-2 w-full max-w-sm mx-4"
          >
            <Input
              autoFocus
              value={typeBuffer}
              onChange={(e) => setTypeBuffer(e.target.value)}
              placeholder="Type text and press Enter to send to the browser…"
              className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm"
            />
            <Button type="submit" size="sm" className="h-7 px-3 text-xs">Send</Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTypingMode(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------

export function BrowserPanelStatusBar({ className }: { className?: string }) {
  const { currentUrl, isConnected, mode } = useBrowserPanel()
  const host = (() => { try { return new URL(currentUrl).hostname } catch { return currentUrl } })()
  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground', className)}>
      {isConnected
        ? <span className="flex items-center gap-1 text-green-700"><span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />Live</span>
        : <span className="flex items-center gap-1 text-yellow-600"><span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />Reconnecting…</span>
      }
      {host && <span className="truncate">{host}</span>}
      <span className="ml-auto shrink-0">
        {mode === 'human-handoff' && <Badge variant="outline" className="text-[10px] py-0 border-amber-400 text-amber-600">Waiting for you</Badge>}
        {mode === 'interacting' && <Badge variant="outline" className="text-[10px] py-0">Interactive</Badge>}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Save Session Button
// ---------------------------------------------------------------------------

export interface BrowserPanelSaveButtonProps {
  platform: string
  platformLabel: string
  platformUrl: string
  onSaved?: () => void
  className?: string
}

export function BrowserPanelSaveButton({
  platform, platformLabel, platformUrl, onSaved, className,
}: BrowserPanelSaveButtonProps) {
  const { saveSession, isSaving, sessionId } = useBrowserPanel()
  if (!sessionId) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="default"
          className={cn('h-7 gap-1.5 text-xs', className)}
          disabled={isSaving}
          onClick={() => saveSession({ platform, platformLabel, platformUrl, onSaved })}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {isSaving ? 'Saving…' : 'Save login'}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Save your login session so the AI can use {platformLabel} on your behalf
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Default composed navigation toolbar
// ---------------------------------------------------------------------------

export function BrowserPanelDefaultNavigation() {
  const { isLoading } = useBrowserPanel()
  return (
    <BrowserPanelNavigation>
      <BrowserPanelNavButton tooltip="Loading" disabled={isLoading} className="pointer-events-none">
        {isLoading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <RefreshCw className="h-3.5 w-3.5 opacity-30" />}
      </BrowserPanelNavButton>
      <BrowserPanelUrl />
      <div className="mx-1 h-4 w-px bg-border shrink-0" />
      <BrowserPanelModeToggle />
      <BrowserPanelViewportSelector />
      <BrowserPanelFullscreenButton />
    </BrowserPanelNavigation>
  )
}
