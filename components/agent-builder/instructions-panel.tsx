'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Eye,
  Code2,
  Copy,
  Check,
  FileText,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ScrollText,
  AlertTriangle,
  Zap,
  Search,
  Globe,
  Wrench,
} from 'lucide-react'
import type { Agent } from '@/lib/types'
import { ToolCall } from '@/components/prompt-kit/tool-call'
import { Markdown } from '@/components/prompt-kit/markdown'
import { ToolsPanel } from './tools-panel'
import { TOOL_LABELS as CATALOG_TOOL_LABELS } from '@/lib/tools/catalog'

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'preview' | 'instructions' | 'json' | 'logs' | 'tools'
type PreviewView = 'form' | 'running' | 'result'

interface ExecutionStep {
  id: string
  type: 'reasoning' | 'thinking' | 'tool' | 'result' | 'error'
  message: string
  timestamp: Date
  toolData?: {
    name: string
    state: 'pending' | 'running' | 'completed' | 'error'
    input?: Record<string, unknown>
    output?: Record<string, unknown>
  }
}

// Raw log entry — one per significant SSE event
interface LogEntry {
  id: string
  kind: 'start' | 'reasoning' | 'text' | 'tool_start' | 'tool_end' | 'error' | 'done' | 'finish'
  summary: string
  detail?: unknown
  ts: number
}

const TOOL_LABELS: Record<string, string> = {
  ...CATALOG_TOOL_LABELS,
  // Keep friendly short-form labels for the two default tools
  web_search: 'Web search',
  web_scrape: 'Read webpage',
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'instructions', label: 'Instructions', icon: FileText },
  { id: 'json', label: 'JSON', icon: Code2 },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'tools', label: 'Tools', icon: Wrench },
]

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

function renderResult(data: unknown): React.ReactNode {
  if (!data) return null
  if (typeof data === 'string') return <Markdown>{data}</Markdown>
  const obj = data as Record<string, unknown>
  if (obj.result && typeof obj.result === 'string' && Object.keys(obj).length === 1) {
    return <Markdown>{obj.result}</Markdown>
  }
  return (
    <div className="space-y-4">
      {Object.entries(obj).map(([key, value]) => {
        if (key === 'result' && typeof value === 'string') {
          return (
            <div key={key} className="rounded-lg border border-border bg-muted/20 p-4">
              <Markdown>{value}</Markdown>
            </div>
          )
        }
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          return (
            <div key={key} className="space-y-2">
              <h4 className="text-xs font-semibold capitalize text-foreground">
                {key.replace(/_/g, ' ')}
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {Object.keys(value[0] || {}).map((col) => (
                        <th key={col} className="px-3 py-2 font-medium capitalize">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {value.map((item, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        {Object.values(item || {}).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-muted-foreground">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
        return (
          <div key={key} className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {key.replace(/_/g, ' ')}
            </h4>
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-foreground">
              <Markdown>
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </Markdown>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Log entry renderer ────────────────────────────────────────────────────────

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false)
  const time = new Date(entry.ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const config: Record<
    LogEntry['kind'],
    { color: string; bgColor: string; icon: React.ElementType; label: string }
  > = {
    start: { color: 'text-muted-foreground', bgColor: 'bg-muted/30', icon: Zap, label: 'START' },
    reasoning: { color: 'text-violet-600', bgColor: 'bg-violet-500/10', icon: Brain, label: 'REASON' },
    text: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', icon: Sparkles, label: 'TEXT' },
    tool_start: { color: 'text-amber-600', bgColor: 'bg-amber-500/10', icon: Search, label: 'TOOL ▶' },
    tool_end: { color: 'text-green-600', bgColor: 'bg-green-500/10', icon: CheckCircle2, label: 'TOOL ◀' },
    error: { color: 'text-red-600', bgColor: 'bg-red-500/10', icon: XCircle, label: 'ERROR' },
    done: { color: 'text-green-600', bgColor: 'bg-green-500/10', icon: CheckCircle2, label: 'DONE' },
    finish: { color: 'text-muted-foreground', bgColor: 'bg-muted/30', icon: Globe, label: 'FINISH' },
  }

  const c = config[entry.kind]
  const Icon = c.icon
  const hasDetail = entry.detail !== undefined

  return (
    <div className={`rounded-md border border-border ${c.bgColor} overflow-hidden`}>
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-start gap-2.5 px-3 py-2 text-left ${hasDetail ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'}`}
      >
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground/60">
          {time}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${c.color} ${c.bgColor}`}
        >
          {c.label}
        </span>
        <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${c.color}`} />
        <span className="flex-1 truncate text-xs text-foreground/80">{entry.summary}</span>
        {hasDetail && (
          <span className="ml-auto shrink-0">
            {open ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        )}
      </button>
      {open && entry.detail !== undefined && (
        <div className="border-t border-border/40 px-3 py-2">
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground/70">
            {typeof entry.detail === 'string'
              ? entry.detail
              : JSON.stringify(entry.detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface InstructionsPanelProps {
  agent: Agent
}

export function InstructionsPanel({ agent: initialAgent }: InstructionsPanelProps) {
  const [tab, setTab] = useState<Tab>('preview')
  const [copied, setCopied] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<Agent>(initialAgent)

  // Execution state
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [finalOutput, setFinalOutput] = useState<unknown>(null)
  const [previewView, setPreviewView] = useState<PreviewView>('form')
  const [executionError, setExecutionError] = useState<string | null>(null)

  const stepsEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logIdCounter = useRef(0)

  const nextLogId = () => `log-${++logIdCounter.current}`

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const agent = currentAgent
  const instructionPrompt = agent.instruction_prompt
  const executionContext = agent.execution_context as {
    triggerConfig?: {
      inputFields?: Array<{
        name: string
        label: string
        type: string
        placeholder?: string
        required?: boolean
      }>
      buttonLabel?: string
    }
  } | undefined

  const inputFields = executionContext?.triggerConfig?.inputFields ?? []
  const buttonLabel = executionContext?.triggerConfig?.buttonLabel ?? `Run ${agent.name}`

  // ── Execute ──────────────────────────────────────────────────────────────

  const handleExecute = async () => {
    setSteps([])
    setLogs([])
    setFinalOutput(null)
    setExecutionError(null)
    setIsExecuting(true)
    setPreviewView('running')

    // If logs tab is not active, switch to logs so the user can watch
    // (but only if they haven't manually selected another tab — keep preview if there)
    const input =
      inputFields.length > 0
        ? Object.fromEntries(inputFields.map((f) => [f.name, inputValues[f.name] || '']))
        : { task: inputValues['default'] || '' }

    // Local accumulators (avoid O(n) state reads inside the loop)
    let currentReasoningText = ''
    let currentAssistantText = ''
    const reasoningStepId = `reasoning-${Date.now()}`
    let assistantStepId = `assistant-${Date.now()}`
    const reasoningLogId = nextLogId()
    let textLogId = nextLogId()

    const pushLog = (entry: Omit<LogEntry, 'id'>) =>
      setLogs((prev) => [...prev, { id: nextLogId(), ...entry }])

    const updateLog = (id: string, patch: Partial<LogEntry>) =>
      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      )

    try {
      const response = await fetch(`/api/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        const msg = (errJson as { error?: string }).error ?? `HTTP ${response.status}`
        throw new Error(msg)
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
          try {
            data = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          const t = data.type as string

          // ── Reasoning ────────────────────────────────────────────────────
          if (t === 'reasoning') {
            const delta = String(data.delta ?? '')
            currentReasoningText += delta

            setSteps((prev) => {
              const others = prev.filter((s) => s.id !== reasoningStepId)
              return [
                {
                  id: reasoningStepId,
                  type: 'reasoning',
                  message: currentReasoningText,
                  timestamp: new Date(),
                },
                ...others,
              ]
            })

            // Update reasoning log in place
            setLogs((prev) => {
              const exists = prev.find((l) => l.id === reasoningLogId)
              if (exists) {
                return prev.map((l) =>
                  l.id === reasoningLogId
                    ? {
                        ...l,
                        summary: `${currentReasoningText.length} chars`,
                        detail: currentReasoningText,
                      }
                    : l,
                )
              }
              return [
                ...prev,
                {
                  id: reasoningLogId,
                  kind: 'reasoning',
                  summary: `${currentReasoningText.length} chars`,
                  detail: currentReasoningText,
                  ts: Date.now(),
                },
              ]
            })
          }

          // ── Assistant text ────────────────────────────────────────────────
          else if (t === 'assistant') {
            const delta = String(data.delta ?? '')
            currentAssistantText += delta

            setSteps((prev) => {
              const others = prev.filter((s) => s.id !== assistantStepId)
              return [
                ...others,
                {
                  id: assistantStepId,
                  type: 'thinking',
                  message: currentAssistantText,
                  timestamp: new Date(),
                },
              ]
            })

            // Update text log in place
            setLogs((prev) => {
              const exists = prev.find((l) => l.id === textLogId)
              const preview = currentAssistantText.slice(0, 120)
              if (exists) {
                return prev.map((l) =>
                  l.id === textLogId
                    ? { ...l, summary: preview, detail: currentAssistantText }
                    : l,
                )
              }
              return [
                ...prev,
                {
                  id: textLogId,
                  kind: 'text',
                  summary: preview,
                  detail: currentAssistantText,
                  ts: Date.now(),
                },
              ]
            })
          }

          // ── Tool call ─────────────────────────────────────────────────────
          else if (t === 'tool') {
            const toolName = String(data.tool ?? '')
            const toolLabel = TOOL_LABELS[toolName] ?? toolName
            const status = String(data.status ?? '')
            const toolStepId = `tool-${toolName}-${data.stepIndex ?? 0}`

            if (status === 'running') {
              setSteps((prev) => {
                const others = prev.filter((s) => s.id !== toolStepId)
                return [
                  ...others,
                  {
                    id: toolStepId,
                    type: 'tool',
                    message: toolLabel,
                    timestamp: new Date(),
                    toolData: {
                      name: toolLabel,
                      state: 'running',
                      input: data.input as Record<string, unknown> | undefined,
                    },
                  },
                ]
              })
              pushLog({
                kind: 'tool_start',
                summary: `${toolLabel}: ${JSON.stringify(data.input ?? {}).slice(0, 80)}`,
                detail: data.input,
                ts: Number(data.timestamp ?? Date.now()),
              })

              // Reset text accumulator after tool call
              currentAssistantText = ''
              assistantStepId = `assistant-${Date.now()}`
              textLogId = nextLogId()
            } else if (status === 'completed') {
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === toolStepId
                    ? {
                        ...s,
                        toolData: {
                          name: toolLabel,
                          state: 'completed',
                          input: data.input as Record<string, unknown> | undefined,
                          output: data.output as Record<string, unknown> | undefined,
                        },
                      }
                    : s,
                ),
              )
              pushLog({
                kind: 'tool_end',
                summary: `${toolLabel} returned ${JSON.stringify(data.output ?? {}).slice(0, 80)}`,
                detail: data.output,
                ts: Number(data.timestamp ?? Date.now()),
              })
            }
          }

          // ── Error ─────────────────────────────────────────────────────────
          else if (t === 'error') {
            const msg = String(data.error ?? 'Unknown error')
            setExecutionError(msg)
            setSteps((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                type: 'error',
                message: msg,
                timestamp: new Date(),
              },
            ])
            pushLog({ kind: 'error', summary: msg, detail: msg, ts: Date.now() })
          }

          // ── Complete ─────────────────────────────────────────────────────
          else if (t === 'complete') {
            const output =
              (data.result as { output?: unknown } | undefined)?.output ?? data.result
            // Check if output actually has content (empty string result = agent produced nothing)
            const resultText =
              output && typeof output === 'object'
                ? (output as Record<string, unknown>).result
                : output
            const hasContent =
              resultText !== undefined && resultText !== null && String(resultText).trim() !== ''

            if (hasContent) {
              setFinalOutput(output)
              setPreviewView('result')
              pushLog({ kind: 'done', summary: 'Execution complete', ts: Date.now() })
            } else {
              // Agent ran but produced no visible text — stay in running view showing error
              const emptyMsg =
                'Agent completed but produced no output. Check the Logs tab for tool activity.'
              setExecutionError(emptyMsg)
              setSteps((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  type: 'error',
                  message: emptyMsg,
                  timestamp: new Date(),
                },
              ])
              pushLog({ kind: 'error', summary: emptyMsg, ts: Date.now() })
            }
          }

          // ── Finish (token stats) ─────────────────────────────────────────
          else if (t === 'finish') {
            const usage = data.usage as { totalTokens?: number } | undefined
            pushLog({
              kind: 'finish',
              summary: usage?.totalTokens
                ? `${usage.totalTokens} tokens used`
                : `Finish: ${data.finishReason ?? 'stop'}`,
              detail: { finishReason: data.finishReason, usage: data.usage },
              ts: Date.now(),
            })
          }

          // ── Start ────────────────────────────────────────────────────────
          else if (t === 'start') {
            pushLog({
              kind: 'start',
              summary: `Running ${agent.name}…`,
              ts: Date.now(),
            })
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Execution failed'
      setExecutionError(msg)
      setSteps((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, type: 'error', message: msg, timestamp: new Date() },
      ])
      pushLog({ kind: 'error', summary: msg, detail: msg, ts: Date.now() })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleReset = () => {
    setSteps([])
    setFinalOutput(null)
    setExecutionError(null)
    setPreviewView('form')
  }

  const handleCopy = async () => {
    const text =
      tab === 'instructions'
        ? instructionPrompt ?? ''
        : JSON.stringify(
            {
              instruction_prompt: instructionPrompt,
              execution_context: executionContext,
              tool_config: agent.tool_config,
            },
            null,
            2,
          )
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!instructionPrompt) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No instructions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chat with Terabits to build your agent. Instructions will appear here.
          </p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                tab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
              {/* Red dot on Logs tab when there are error entries */}
              {id === 'logs' && logs.some((l) => l.kind === 'error') && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
              {/* Green dot on Logs tab when executing */}
              {id === 'logs' && isExecuting && logs.length > 0 && !logs.some((l) => l.kind === 'error') && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {tab === 'preview' && previewView !== 'form' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          {(tab === 'instructions' || tab === 'json') && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {tab === 'logs' && logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* ── Preview / Live Execution ──────────────────────────────────── */}
        {tab === 'preview' && (
          <div className="flex h-full flex-col">
            {/* Agent header */}
            <div className="shrink-0 border-b border-border/50 bg-muted/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">
                    {(agent.name ?? 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{agent.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-medium text-green-600">
                  Ready
                </span>
              </div>
            </div>

            {/* Form */}
            {previewView === 'form' && (
              <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8">
                <div className="w-full max-w-sm space-y-5">
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
                              onChange={(e) =>
                                setInputValues((p) => ({ ...p, [field.name]: e.target.value }))
                              }
                              placeholder={
                                field.placeholder ?? `Enter ${field.label.toLowerCase()}…`
                              }
                              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              rows={3}
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={inputValues[field.name] || ''}
                              onChange={(e) =>
                                setInputValues((p) => ({ ...p, [field.name]: e.target.value }))
                              }
                              placeholder={
                                field.placeholder ?? `Enter ${field.label.toLowerCase()}…`
                              }
                              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleExecute}
                        disabled={!inputFields.every(
                          (f) => !f.required || inputValues[f.name]?.trim(),
                        )}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
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
                        placeholder="What should I do first?"
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button
                        onClick={handleExecute}
                        disabled={!inputValues['default']?.trim()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {buttonLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execution log (running) */}
            {previewView === 'running' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {steps.map((step) => {
                    if (step.type === 'reasoning') {
                      return (
                        <ReasoningBlock
                          key={step.id}
                          text={step.message}
                          isStreaming={isExecuting}
                        />
                      )
                    }
                    if (step.type === 'tool' && step.toolData) {
                      return (
                        <ToolCall
                          key={step.id}
                          name={step.toolData.name}
                          state={step.toolData.state}
                          input={step.toolData.input}
                          output={step.toolData.output}
                          defaultOpen={false}
                        />
                      )
                    }
                    if (step.type === 'thinking') {
                      return (
                        <div key={step.id} className="flex gap-3 px-1">
                          <Sparkles className="mt-1 h-4 w-4 shrink-0 text-blue-500" />
                          <Markdown className="text-sm italic leading-relaxed text-muted-foreground">
                            {step.message}
                          </Markdown>
                        </div>
                      )
                    }
                    if (step.type === 'error') {
                      return (
                        <div
                          key={step.id}
                          className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          <div>
                            <p className="text-xs font-semibold text-red-600">Execution error</p>
                            <p className="mt-0.5 text-xs text-red-600/80">{step.message}</p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}

                  {isExecuting && (
                    <div className="flex items-center justify-center py-6">
                      <div className="flex animate-pulse items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <span className="text-[10px] font-medium uppercase tracking-tight text-primary">
                          Agent is working…
                        </span>
                      </div>
                    </div>
                  )}

                  {!isExecuting && executionError && steps.every((s) => s.type !== 'result') && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
                      <XCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
                      <p className="text-sm font-medium text-red-600">Execution failed</p>
                      <p className="mt-1 text-xs text-red-500/80">{executionError}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Check the{' '}
                        <button
                          onClick={() => setTab('logs')}
                          className="underline hover:text-foreground"
                        >
                          Logs tab
                        </button>{' '}
                        for details.
                      </p>
                    </div>
                  )}

                  <div ref={stepsEndRef} />
                </div>
              </div>
            )}

            {/* Result */}
            {previewView === 'result' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-foreground">Task complete</span>
                  <button
                    onClick={handleReset}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Run again
                  </button>
                </div>
                {renderResult(finalOutput)}
              </div>
            )}
          </div>
        )}

        {/* ── Instructions ──────────────────────────────────────────────── */}
        {tab === 'instructions' && (
          <div className="h-full overflow-y-auto p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Executor System Prompt
            </p>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80">
                {instructionPrompt}
              </pre>
            </div>
          </div>
        )}

        {/* ── JSON ──────────────────────────────────────────────────────── */}
        {tab === 'json' && (
          <div className="h-full overflow-y-auto p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Raw Configuration
            </p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-4 font-mono text-[11px] leading-relaxed text-foreground/80">
              {JSON.stringify(
                {
                  instruction_prompt: instructionPrompt,
                  execution_context: executionContext,
                  tool_config: agent.tool_config,
                },
                null,
                2,
              )}
            </pre>
          </div>
        )}

        {/* ── Logs ──────────────────────────────────────────────────────── */}
        {tab === 'logs' && (
          <div className="h-full overflow-y-auto p-4">
            {logs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <ScrollText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No execution logs yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Run the agent from the Preview tab. All events will appear here in real-time.
                  </p>
                </div>
                <button
                  onClick={() => setTab('preview')}
                  className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Go to Preview
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {logs.map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
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

        {/* ── Tools ─────────────────────────────────────────────────────── */}
        {tab === 'tools' && (
          <ToolsPanel
            agent={currentAgent}
            onUpdate={(toolConfig) =>
              setCurrentAgent((prev) => ({ ...prev, tool_config: toolConfig }))
            }
          />
        )}
      </div>
    </div>
  )
}
