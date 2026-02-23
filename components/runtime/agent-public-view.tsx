'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Zap,
  Search,
  Globe,
  ScrollText,
  Pencil,
  Clock,
  History,
  ArrowUpRight,
  FileDown,
  Share2,
  Check,
  Coins,
} from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/prompt-kit/markdown'
import { ToolCall } from '@/components/prompt-kit/tool-call'
import { CreditsPurchaseModalSimple } from '@/components/dashboard/credits-purchase-modal-simple'

// ── Types ─────────────────────────────────────────────────────────────────────

type PublicView = 'form' | 'running' | 'result'
type RightPanel = 'live' | 'history'

interface ExecutionStep {
  id: string
  type: 'reasoning' | 'thinking' | 'tool' | 'result' | 'error' | 'credits'
  message: string
  timestamp: Date
  toolData?: {
    name: string
    state: 'pending' | 'running' | 'completed' | 'error'
    input?: Record<string, unknown>
    output?: Record<string, unknown>
  }
}

interface LogEntry {
  id: string
  kind: 'start' | 'reasoning' | 'text' | 'tool_start' | 'tool_end' | 'error' | 'done' | 'finish' | 'credits'
  summary: string
  detail?: unknown
  ts: number
}

interface InputField {
  name: string
  label: string
  type: string
  placeholder?: string
  required?: boolean
}

interface StoredLog {
  kind: string
  summary: string
  ts: number
}

interface HistoricRun {
  id: string
  lane: string
  status: string
  input: unknown
  output: {
    result?: string
    logs?: StoredLog[]
    tool_calls_count?: number
    tokens_used?: number | null
  } | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface AgentPublicViewProps {
  slug: string
  agentId: string
  name: string
  description: string | null
  executionContext: Record<string, unknown> | null
  isOwner?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Web search',
  web_scrape: 'Read webpage',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function inputSummary(input: unknown): string {
  if (!input || typeof input !== 'object') return String(input ?? '')
  const entries = Object.entries(input as Record<string, unknown>).filter(([, v]) => v !== '' && v != null)
  if (entries.length === 0) return ''
  const [, v] = entries[0]
  return String(v).slice(0, 80)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReasoningBlock({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [open, setOpen] = useState(isStreaming)
  useEffect(() => setOpen(isStreaming), [isStreaming])
  if (!text) return null
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-violet-600 transition-colors hover:text-violet-700"
      >
        <Brain className="h-3 w-3 shrink-0" />
        <span className="font-medium">Agent reasoning</span>
        {isStreaming && <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />}
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-violet-500/20 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground/70 whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  )
}

function LiveLogEntry({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false)
  const time = new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  const config: Record<LogEntry['kind'], { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
    start:     { color: 'text-muted-foreground', bgColor: 'bg-muted/30',      icon: Zap,         label: 'START'  },
    reasoning: { color: 'text-violet-600',       bgColor: 'bg-violet-500/10', icon: Brain,       label: 'REASON' },
    text:      { color: 'text-blue-600',          bgColor: 'bg-blue-500/10',   icon: Sparkles,    label: 'TEXT'   },
    tool_start:{ color: 'text-amber-600',         bgColor: 'bg-amber-500/10',  icon: Search,      label: 'TOOL ▶' },
    tool_end:  { color: 'text-green-600',         bgColor: 'bg-green-500/10',  icon: CheckCircle2,label: 'TOOL ◀' },
    error:     { color: 'text-red-600',           bgColor: 'bg-red-500/10',    icon: XCircle,     label: 'ERROR'  },
    done:      { color: 'text-green-600',         bgColor: 'bg-green-500/10',  icon: CheckCircle2,label: 'DONE'   },
    finish:    { color: 'text-muted-foreground',  bgColor: 'bg-muted/30',      icon: Globe,       label: 'FINISH' },
    credits:   { color: 'text-yellow-600',        bgColor: 'bg-yellow-500/10', icon: Coins,       label: 'CREDITS'},
  }

  const c = config[entry.kind]
  const Icon = c.icon
  const hasDetail = entry.detail !== undefined

  return (
    <div className={`rounded-md border border-border ${c.bgColor} overflow-hidden`}>
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-start gap-2 px-2.5 py-1.5 text-left ${hasDetail ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'}`}
      >
        <span className="mt-0.5 shrink-0 font-mono text-[9px] text-muted-foreground/50">{time}</span>
        <span className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold ${c.color} ${c.bgColor}`}>{c.label}</span>
        <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${c.color}`} />
        <span className="flex-1 truncate text-[11px] text-foreground/80">{entry.summary}</span>
        {hasDetail && <span className="ml-auto shrink-0">{open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}</span>}
      </button>
      {open && entry.detail !== undefined && (
        <div className="border-t border-border/40 px-3 py-2">
          <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed text-foreground/70">
            {typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function HistoricRunRow({ run, onSelect, isSelected }: { run: HistoricRun; onSelect: (run: HistoricRun) => void; isSelected: boolean }) {
  const [open, setOpen] = useState(false)
  const success = run.status === 'completed'
  const duration =
    run.started_at && run.completed_at
      ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
      : null

  return (
    <div className={`rounded-lg border bg-card/50 overflow-hidden transition-colors ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}>
      <button
        onClick={() => { setOpen((o) => !o); onSelect(run) }}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <span className={`mt-1 shrink-0 h-2 w-2 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-[11px] text-foreground/80">{inputSummary(run.input) || 'No input'}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            <Clock className="h-2.5 w-2.5 shrink-0" />
            <span>{run.started_at ? formatRelativeTime(run.started_at) : '—'}</span>
            {duration !== null && <span>· {duration}s</span>}
            {run.output?.tool_calls_count ? <span>· {run.output.tool_calls_count} tools</span> : null}
            <span className={`rounded-full px-1.5 py-0.5 font-medium text-[9px] ${run.lane === 'public-execute' ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
              {run.lane === 'public-execute' ? 'Public' : 'Preview'}
            </span>
          </div>
        </div>
        <span className="ml-auto shrink-0 mt-0.5">
          {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50 px-3 py-3 space-y-3">
          {run.output?.result && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output</p>
              <div className="max-h-52 overflow-y-auto rounded-md bg-muted/30 p-2.5 text-[11px] leading-relaxed">
                <Markdown>{run.output.result}</Markdown>
              </div>
            </div>
          )}
          {run.error && !run.output?.result && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-2.5">
              <XCircle className="h-3 w-3 shrink-0 text-red-500 mt-0.5" />
              <p className="text-[11px] text-red-600">{run.error}</p>
            </div>
          )}
          {run.output?.logs && run.output.logs.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Events ({run.output.logs.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {run.output.logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`shrink-0 rounded px-1 font-mono font-bold text-[9px] ${
                      log.kind === 'error' ? 'bg-red-500/10 text-red-600'
                      : log.kind.startsWith('tool') ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-muted/40 text-muted-foreground'
                    }`}>{log.kind.toUpperCase().replace('_', ' ')}</span>
                    <span className="truncate">{log.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {run.output?.tokens_used != null && (
            <p className="text-[10px] text-muted-foreground">{run.output.tokens_used.toLocaleString()} tokens used</p>
          )}
        </div>
      )}
    </div>
  )
}

function renderResult(data: unknown): React.ReactNode {
  if (!data) return null
  if (typeof data === 'string') return <Markdown>{data}</Markdown>
  const obj = data as Record<string, unknown>
  if (obj.result && typeof obj.result === 'string' && Object.keys(obj).length === 1) return <Markdown>{obj.result}</Markdown>
  return (
    <div className="space-y-4">
      {Object.entries(obj).map(([key, value]) => {
        if (key === 'result' && typeof value === 'string') return (
          <div key={key} className="rounded-lg border border-border bg-muted/20 p-4"><Markdown>{value}</Markdown></div>
        )
        return (
          <div key={key} className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{key.replace(/_/g, ' ')}</h4>
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <Markdown>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</Markdown>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentPublicView({
  slug,
  agentId,
  name,
  description,
  executionContext,
  isOwner = false,
}: AgentPublicViewProps) {
  const router = useRouter()
  const [view, setView] = useState<PublicView>('form')
  const [rightPanel, setRightPanel] = useState<RightPanel>('live')
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [finalOutput, setFinalOutput] = useState<unknown>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [historicRuns, setHistoricRuns] = useState<HistoricRun[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [isUndeploying, setIsUndeploying] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [activityLabel, setActivityLabel] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false)

  const stepsEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const logIdCounter = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const nextLogId = () => `log-${++logIdCounter.current}`

  useEffect(() => { stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [steps])
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const triggerConfig = (executionContext as any)?.triggerConfig as
    | { inputFields?: InputField[]; buttonLabel?: string } | undefined
  const inputFields = triggerConfig?.inputFields ?? []
  const buttonLabel = triggerConfig?.buttonLabel ?? `Run ${name}`

  // Fetch run history — owner only
  const fetchHistory = useCallback(async () => {
    if (!isOwner) return
    setRunsLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/runs?limit=20`)
      if (res.ok) setHistoricRuns(await res.json())
    } finally {
      setRunsLoading(false)
    }
  }, [agentId, isOwner])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Fetch credit balance on mount (owner only)
  useEffect(() => {
    if (!isOwner) return
    fetch('/api/user/credits')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCreditBalance(data.balance?.balance ?? 0) })
      .catch(() => {})
  }, [isOwner])

  const handleUndeploy = async () => {
    setIsUndeploying(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/deploy`, { method: 'DELETE' })
      if (res.ok) {
        router.push(`/agent/${agentId}`)
        router.refresh()
      }
    } finally {
      setIsUndeploying(false)
    }
  }

  const handleExecute = async () => {
    setSteps([])
    setLogs([])
    setFinalOutput(null)
    setExecutionError(null)
    setIsExecuting(true)
    setView('running')
    setRightPanel('live')
    setSelectedRunId(null)
    setActivityLabel(null)
    setCurrentRunId(null)

    const input =
      inputFields.length > 0
        ? Object.fromEntries(inputFields.map((f) => [f.name, inputValues[f.name] || '']))
        : { task: inputValues['default'] || '' }

    let currentReasoningText = ''
    let currentAssistantText = ''
    const reasoningStepId = `reasoning-${Date.now()}`
    let assistantStepId = `assistant-${Date.now()}`
    const reasoningLogId = nextLogId()
    let textLogId = nextLogId()

    const pushLog = (entry: Omit<LogEntry, 'id'>) =>
      setLogs((prev) => [...prev, { id: nextLogId(), ...entry }])

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const response = await fetch(`/api/public/${slug}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
        signal,
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error((errJson as { error?: string }).error ?? `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          let data: Record<string, unknown>
          try { data = JSON.parse(line.slice(6)) } catch { continue }
          const t = data.type as string

          if (t === 'reasoning') {
            const delta = String(data.delta ?? '')
            currentReasoningText += delta
            setSteps((prev) => {
              const others = prev.filter((s) => s.id !== reasoningStepId)
              return [{ id: reasoningStepId, type: 'reasoning', message: currentReasoningText, timestamp: new Date() }, ...others]
            })
            setLogs((prev) => {
              const exists = prev.find((l) => l.id === reasoningLogId)
              if (exists) return prev.map((l) => l.id === reasoningLogId ? { ...l, summary: `${currentReasoningText.length} chars`, detail: currentReasoningText } : l)
              return [...prev, { id: reasoningLogId, kind: 'reasoning', summary: `${currentReasoningText.length} chars`, detail: currentReasoningText, ts: Date.now() }]
            })
          } else if (t === 'assistant') {
            const delta = String(data.delta ?? '')
            currentAssistantText += delta
            setSteps((prev) => {
              const others = prev.filter((s) => s.id !== assistantStepId)
              return [...others, { id: assistantStepId, type: 'thinking', message: currentAssistantText, timestamp: new Date() }]
            })
            setLogs((prev) => {
              const exists = prev.find((l) => l.id === textLogId)
              const preview = currentAssistantText.slice(0, 120)
              if (exists) return prev.map((l) => l.id === textLogId ? { ...l, summary: preview, detail: currentAssistantText } : l)
              return [...prev, { id: textLogId, kind: 'text', summary: preview, detail: currentAssistantText, ts: Date.now() }]
            })
          } else if (t === 'tool') {
            const toolName = String(data.tool ?? '')
            const toolLabel = TOOL_LABELS[toolName] ?? toolName
            const status = String(data.status ?? '')
            const toolStepId = `tool-${toolName}-${data.stepIndex ?? 0}`

            if (status === 'running') {
              setSteps((prev) => [...prev.filter((s) => s.id !== toolStepId), {
                id: toolStepId, type: 'tool', message: toolLabel, timestamp: new Date(),
                toolData: { name: toolLabel, state: 'running', input: data.input as Record<string, unknown> | undefined },
              }])
              pushLog({ kind: 'tool_start', summary: `${toolLabel}: ${JSON.stringify(data.input ?? {}).slice(0, 80)}`, detail: data.input, ts: Number(data.timestamp ?? Date.now()) })
              currentAssistantText = ''
              assistantStepId = `assistant-${Date.now()}`
              textLogId = nextLogId()
            } else if (status === 'completed') {
              setSteps((prev) => prev.map((s) => s.id === toolStepId ? {
                ...s, toolData: { name: toolLabel, state: 'completed',
                  input: data.input as Record<string, unknown> | undefined,
                  output: data.output as Record<string, unknown> | undefined },
              } : s))
              pushLog({ kind: 'tool_end', summary: `${toolLabel} → ${JSON.stringify(data.output ?? {}).slice(0, 80)}`, detail: data.output, ts: Number(data.timestamp ?? Date.now()) })
            }
          } else if (t === 'error') {
            const msg = String(data.error ?? 'Unknown error')
            setExecutionError(msg)
            setSteps((prev) => [...prev, { id: `error-${Date.now()}`, type: 'error', message: msg, timestamp: new Date() }])
            pushLog({ kind: 'error', summary: msg, detail: msg, ts: Date.now() })
          } else if (t === 'complete') {
            const output = (data.result as { output?: unknown } | undefined)?.output ?? data.result
            const resultText = output && typeof output === 'object' ? (output as Record<string, unknown>).result : output
            const hasContent = resultText !== undefined && resultText !== null && String(resultText).trim() !== ''

            if (hasContent) {
              setFinalOutput(output)
              setView('result')
              pushLog({ kind: 'done', summary: 'Execution complete', ts: Date.now() })
            } else {
              const emptyMsg = 'Agent completed but produced no output. Check the activity log.'
              setExecutionError(emptyMsg)
              setSteps((prev) => [...prev, { id: `error-${Date.now()}`, type: 'error', message: emptyMsg, timestamp: new Date() }])
              pushLog({ kind: 'error', summary: emptyMsg, ts: Date.now() })
            }
          } else if (t === 'finish') {
            const usage = data.usage as { totalTokens?: number } | undefined
            pushLog({
              kind: 'finish',
              summary: usage?.totalTokens ? `${usage.totalTokens} tokens used` : `Finish: ${data.finishReason ?? 'stop'}`,
              detail: { finishReason: data.finishReason, usage: data.usage },
              ts: Date.now(),
            })
          } else if (t === 'credits_used') {
            const newBalance = data.balanceAfter as number
            setCreditBalance(newBalance)
            const totalTokens = (data.totalTokens as number ?? 0).toLocaleString()
            const cost = (data.platformCostUsd as number ?? 0).toFixed(4)
            const creditsUsed = data.creditsUsed as number
            // Show finish toast with cost breakdown
            toast.success('Run complete', {
              description: `${creditsUsed} credit${creditsUsed !== 1 ? 's' : ''} used · ${totalTokens} tokens · ~$${cost}`,
              duration: 8000,
              action:
                newBalance < 10
                  ? { label: 'Buy Credits', onClick: () => setShowNoCreditsModal(true) }
                  : undefined,
            })
            // Also append to activity log
            pushLog({
              kind: 'done',
              summary: `${creditsUsed} credits · ${totalTokens} tokens · ~$${cost}`,
              detail: {
                creditsUsed,
                balanceAfter: newBalance,
                totalTokens: data.totalTokens,
                aiCostUsd: data.aiCostUsd,
                platformCostUsd: data.platformCostUsd,
              },
              ts: Date.now(),
            })
          } else if (t === 'start') {
            if (data.runId) setCurrentRunId(String(data.runId))
            // Update credit balance from server-provided value
            if (data.creditBalance !== undefined && data.creditBalance !== null) {
              setCreditBalance(data.creditBalance as number)
            }
            const balance = (data.creditBalance ?? creditBalance) as number | null
            pushLog({
              kind: 'start',
              summary: `Running ${name}…${balance !== null ? ` · ${balance} credits available` : ''}`,
              ts: Date.now(),
            })
            // Show start toast with available credits (owner only)
            if (isOwner && balance !== null) {
              toast(`Starting ${name}`, {
                description: `${balance.toLocaleString()} credits available`,
                icon: '⚡',
                duration: 3000,
              })
            }
          }
        }
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (isAbort) {
        setExecutionError('Run stopped.')
        pushLog({ kind: 'done', summary: 'Stopped by user. Credits used have been applied.', ts: Date.now() })
        toast.info('Run stopped. Credits used have been applied.')
        if (isOwner) {
          fetch('/api/user/credits').then(r => r.ok ? r.json() : null).then(data => { if (data?.balance?.balance != null) setCreditBalance(data.balance.balance) }).catch(() => {})
        }
      } else {
        const msg = error instanceof Error ? error.message : 'Execution failed'
        setExecutionError(msg)
        setSteps((prev) => [...prev, { id: `error-${Date.now()}`, type: 'error', message: msg, timestamp: new Date() }])
        pushLog({ kind: 'error', summary: msg, detail: msg, ts: Date.now() })
      }
    } finally {
      setIsExecuting(false)
      // Refresh history 1.5s after run ends to give DB write time to complete
      if (isOwner) setTimeout(fetchHistory, 1500)
    }
  }

  const handleReset = () => {
    setSteps([])
    setFinalOutput(null)
    setExecutionError(null)
    setView('form')
    setSelectedRunId(null)
    setActivityLabel(null)
    setCurrentRunId(null)
  }

  const handleSelectRun = (run: HistoricRun) => {
    // Convert stored logs (from DB) to LiveLogEntry format
    const convertedLogs: LogEntry[] = (run.output?.logs ?? []).map((log, i) => ({
      id: `hist-${run.id}-${i}`,
      kind: (['start', 'reasoning', 'text', 'tool_start', 'tool_end', 'error', 'done', 'finish'] as LogEntry['kind'][]).includes(log.kind as LogEntry['kind'])
        ? (log.kind as LogEntry['kind'])
        : 'done',
      summary: log.summary,
      ts: log.ts,
    }))

    setLogs(convertedLogs)
    setSelectedRunId(run.id)
    setActivityLabel(run.started_at ? formatRelativeTime(run.started_at) : 'Historic run')
    setRightPanel('live')

    if (run.output?.result) {
      setFinalOutput({ result: run.output.result })
      setExecutionError(null)
      setView('result')
    } else if (run.error) {
      setExecutionError(run.error)
      setFinalOutput(null)
      setIsExecuting(false)
      setView('running')
    } else {
      setFinalOutput(null)
      setExecutionError('No output recorded for this run.')
      setIsExecuting(false)
      setView('running')
    }
  }

  const handleExportPDF = () => {
    const content = resultRef.current
    if (!content) return
    // Clone and strip export buttons (data-no-print elements) before printing
    const clone = content.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[data-no-print]').forEach((el) => el.remove())
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>${name}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2.5rem; line-height: 1.7; color: #111; max-width: 900px; margin: 0 auto; }
          h1 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
          h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
          h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.4rem; }
          h4 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.3rem; }
          p { margin: 0.5rem 0; }
          a { color: #0055cc; }
          table { border-collapse: collapse; width: 100%; margin: 1rem 0; page-break-inside: avoid; }
          th, td { border: 1px solid #ccc; padding: 7px 12px; text-align: left; font-size: 13px; }
          th { background: #f0f0f0; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
          tr:nth-child(even) { background: #fafafa; }
          code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 12px; font-family: monospace; }
          pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow: auto; font-size: 12px; }
          ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
          li { margin: 0.2rem 0; }
          blockquote { border-left: 3px solid #ccc; padding-left: 1rem; color: #555; margin: 0.75rem 0; }
          hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
          strong { font-weight: 600; }
          .header { border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .header h2 { margin: 0 0 0.2rem; font-size: 1.4rem; }
          .header p { color: #666; margin: 0; font-size: 0.875rem; }
          @media print { body { padding: 1rem; } }
        </style>
      </head><body>
        <div class="header">
          <h2>${name}</h2>
          ${description ? `<p>${description}</p>` : ''}
        </div>
        ${clone.innerHTML}
      </body></html>
    `)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  const handleShare = async () => {
    // Use currentRunId for a live-completed run, selectedRunId for a historic run
    const runId = currentRunId ?? selectedRunId
    if (!runId) return
    const url = `${window.location.origin}/share/${runId}`
    await navigator.clipboard.writeText(url)
    setShareSuccess(true)
    setTimeout(() => setShareSuccess(false), 2500)
  }

  return (
    <div className="flex h-svh flex-col bg-background">

      {/* Owner banner */}
      {isOwner && (
        <div className="flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-amber-500/5 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <span className="font-medium">Deployed view</span>
            <span className="text-amber-600/70">— builder chat is hidden while deployed.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndeploy}
              disabled={isUndeploying}
              className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
            >
              {isUndeploying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
              {isUndeploying ? 'Undeploying…' : 'Undeploy & Edit'}
            </button>
            <a
              href={`/agent/${agentId}`}
              className="flex items-center gap-1 rounded-md border border-amber-500/20 px-2.5 py-1 text-xs text-amber-600 transition-colors hover:bg-amber-500/10"
            >
              <ArrowUpRight className="h-3 w-3" />
              Builder
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-6 py-3.5">
          <Image
            src="/icon.svg"
            alt="Terabits"
            width={36}
            height={36}
            priority
            className="h-9 w-9 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-foreground">{name}</h1>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
          {/* Credits counter — owner only */}
          {isOwner && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              {isExecuting ? (
                <span className="animate-pulse">Counting credits...</span>
              ) : creditBalance !== null ? (
                <span className={creditBalance === 0 ? 'text-red-500 font-medium' : ''}>
                  {creditBalance.toLocaleString()} credits
                </span>
              ) : null}
            </div>
          )}
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Powered by Terabits AI
          </span>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left 70%: Agent UI ─────────────────────────────────────────── */}
        <div className="flex w-[70%] flex-col overflow-y-auto border-r border-border">
          <div className="flex flex-1 flex-col p-8">

            {/* Form */}
            {view === 'form' && (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="w-full max-w-xl space-y-5">
                  {inputFields.length > 0 ? (
                    <>
                      {inputFields.map((field) => (
                        <div key={field.name}>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {field.label}
                            {field.required && <span className="ml-1 text-destructive">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={inputValues[field.name] || ''}
                              onChange={(e) => setInputValues((p) => ({ ...p, [field.name]: e.target.value }))}
                              placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              rows={4}
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={inputValues[field.name] || ''}
                              onChange={(e) => setInputValues((p) => ({ ...p, [field.name]: e.target.value }))}
                              placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleExecute}
                        disabled={!inputFields.every((f) => !f.required || inputValues[f.name]?.trim())}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {buttonLabel}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={inputValues['default'] || ''}
                        onChange={(e) => setInputValues({ default: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                        placeholder="What should I do?"
                        className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button
                        onClick={handleExecute}
                        disabled={!inputValues['default']?.trim()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {buttonLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Running */}
            {view === 'running' && (
              <div className="space-y-3">
                {steps.map((step) => {
                  if (step.type === 'reasoning') return <ReasoningBlock key={step.id} text={step.message} isStreaming={isExecuting} />
                  if (step.type === 'tool' && step.toolData) return <ToolCall key={step.id} name={step.toolData.name} state={step.toolData.state} input={step.toolData.input} output={step.toolData.output} defaultOpen={false} />
                  if (step.type === 'thinking') return (
                    <div key={step.id} className="flex gap-3 px-1">
                      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-blue-500" />
                      <div className="flex-1 min-w-0 text-sm leading-relaxed text-muted-foreground">
                        <Markdown className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-table:text-muted-foreground prose-a:text-primary">
                          {step.message}
                        </Markdown>
                      </div>
                    </div>
                  )
                  if (step.type === 'error') return (
                    <div key={step.id} className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div>
                        <p className="text-xs font-semibold text-red-600">Error</p>
                        <p className="mt-0.5 text-xs text-red-600/80">{step.message}</p>
                      </div>
                    </div>
                  )
                  if (step.type === 'credits') return (
                    <div key={step.id} className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                      <Coins className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                      <div>
                        <p className="text-xs font-semibold text-yellow-600">Credits</p>
                        <p className="mt-0.5 text-xs text-yellow-600/80">{step.message}</p>
                      </div>
                    </div>
                  )
                  return null
                })}
                {isExecuting && (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <div className="flex animate-pulse items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-5 py-2.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="text-xs font-medium text-primary">Agent is working…</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => abortControllerRef.current?.abort()}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Stop run
                    </button>
                  </div>
                )}
                {!isExecuting && executionError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5 text-center">
                    <XCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
                    <p className="text-sm font-medium text-red-600">Execution failed</p>
                    <p className="mt-1 text-xs text-red-500/80">{executionError}</p>
                    <button onClick={handleReset} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <RotateCcw className="h-3 w-3" /> Try again
                    </button>
                  </div>
                )}
                <div ref={stepsEndRef} />
              </div>
            )}

            {/* Result */}
            {view === 'result' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {selectedRunId ? `Run from ${activityLabel}` : 'Complete'}
                  </span>
                  {selectedRunId && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Historic</span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    {(currentRunId || selectedRunId) && (
                      <button
                        onClick={handleShare}
                        title="Copy shareable link"
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${shareSuccess ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                      >
                        {shareSuccess ? (
                          <><Check className="h-3 w-3" /> Copied!</>
                        ) : (
                          <><Share2 className="h-3 w-3" /> Share</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleExportPDF}
                      title="Export as PDF"
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <FileDown className="h-3 w-3" /> PDF
                    </button>
                    <button onClick={handleReset} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <RotateCcw className="h-3 w-3" /> {selectedRunId ? 'Back to form' : 'Run again'}
                    </button>
                  </div>
                </div>
                <div ref={resultRef}>
                  {renderResult(finalOutput)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right 30%: Activity + History ─────────────────────────────── */}
        <div className="flex w-[30%] flex-col bg-muted/10">

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-border">
            <button
              onClick={() => setRightPanel('live')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${rightPanel === 'live' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <ScrollText className="h-3 w-3" />
              Activity
              {logs.some((l) => l.kind === 'error') && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {isExecuting && !logs.some((l) => l.kind === 'error') && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />}
            </button>
            {isOwner && (
              <button
                onClick={() => setRightPanel('history')}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${rightPanel === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <History className="h-3 w-3" />
                History
                {historicRuns.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{historicRuns.length}</span>
                )}
              </button>
            )}
          </div>

          {/* Activity log */}
          {rightPanel === 'live' && (
            <div className="flex-1 overflow-y-auto p-3">
              {activityLabel && (
                <div className="mb-2 flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                  <History className="h-3 w-3 shrink-0 text-primary" />
                  <span className="text-[10px] font-medium text-primary">Viewing run from {activityLabel}</span>
                </div>
              )}
              {logs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">Run the agent to see activity here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="mb-2 text-[10px] text-muted-foreground">{logs.length} event{logs.length !== 1 ? 's' : ''}</p>
                  {logs.map((entry) => <LiveLogEntry key={entry.id} entry={entry} />)}
                  {isExecuting && (
                    <div className="flex items-center gap-2 rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-[11px] text-primary">Streaming…</span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          )}

          {/* History panel — owner only */}
          {rightPanel === 'history' && isOwner && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{historicRuns.length} run{historicRuns.length !== 1 ? 's' : ''} stored</span>
                <button
                  onClick={fetchHistory}
                  disabled={runsLoading}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className={`h-2.5 w-2.5 ${runsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {runsLoading && historicRuns.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : historicRuns.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">No runs yet. Run the agent to build history.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historicRuns.map((run) => (
                    <HistoricRunRow
                      key={run.id}
                      run={run}
                      onSelect={handleSelectRun}
                      isSelected={selectedRunId === run.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Credits purchase modal */}
      <CreditsPurchaseModalSimple
        isOpen={showNoCreditsModal}
        onOpenChange={setShowNoCreditsModal}
      />
    </div>
  )
}
