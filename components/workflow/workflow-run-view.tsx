'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, Brain, ChevronDown, ChevronRight, ArrowUp, Coins, ScrollText, History, RotateCcw, Wrench } from 'lucide-react'
import type { Workflow } from '@/lib/types'
import { Tool } from '@/components/ai-elements/tool'
import { Markdown } from '@/components/ai-elements/markdown'
import { CreditsPurchaseModalSimple } from '@/components/dashboard/credits-purchase-modal-simple'
import { useHeaderTitle } from '@/components/dashboard/header-title-context'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web',
  web_scrape: 'Scraping website content',
  ai_process: 'Analyzing information',
  read: 'Reading content',
  write: 'Writing data',
}

interface ExecutionStep {
  id: string
  type: 'reasoning' | 'thinking' | 'tool' | 'result' | 'error' | 'credits'
  message: string
  timestamp: Date
  toolData?: { name: string; state: string; input?: unknown; output?: unknown }
}

interface LogEntry {
  id: string
  kind: 'start' | 'reasoning' | 'tool_start' | 'tool_end' | 'text' | 'credits' | 'error' | 'done'
  summary: string
  ts: number
}

interface HistoricRun {
  id: string
  status: string
  input?: unknown
  output?: { result?: string; logs?: { kind: string; summary: string; ts: number }[] }
  error?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  credits_used?: number | null
}

function ReasoningBlock({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [open, setOpen] = useState(isStreaming)
  useEffect(() => setOpen(isStreaming), [isStreaming])
  if (!text) return null
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-foreground"
      >
        <Brain className="h-3 w-3 shrink-0" />
        <span className="font-medium">Reasoning</span>
        {isStreaming && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
        <span className="ml-auto">{open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-3 py-2.5 text-muted-foreground/70 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-[11px]">
          {text}
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffM < 1) return 'Just now'
  if (diffM < 60) return `${diffM}m ago`
  if (diffH < 24) return `${diffH}h ago`
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString()
}

export function WorkflowRunView({ workflow }: { workflow: Workflow }) {
  const triggerConfig = (workflow.execution_context as { triggerConfig?: { inputFields?: Array<{ name: string; label: string; type: string; placeholder?: string; required?: boolean }>; buttonLabel?: string } })?.triggerConfig
  const inputFields = triggerConfig?.inputFields ?? []
  const buttonLabel = triggerConfig?.buttonLabel ?? `Run ${workflow.name}`

  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [finalOutput, setFinalOutput] = useState<unknown>(null)
  const [outputText, setOutputText] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null)
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [historicRuns, setHistoricRuns] = useState<HistoricRun[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [logsTab, setLogsTab] = useState<'live' | 'history'>('live')
  const [showInputForm, setShowInputForm] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const outputScrollRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const logIdCounter = useRef(0)
  const nextLogId = () => `log-${++logIdCounter.current}`

  const { setTitle: setHeaderTitle } = useHeaderTitle()
  useEffect(() => {
    setHeaderTitle(workflow.name)
    return () => setHeaderTitle(null)
  }, [workflow.name, setHeaderTitle])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [steps])

  useEffect(() => {
    outputScrollRef.current?.scrollTo(0, outputScrollRef.current.scrollHeight)
  }, [outputText])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    fetch('/api/user/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCreditBalance(d.balance?.balance ?? 0))
      .catch(() => {})
  }, [])

  const fetchHistory = useCallback(async () => {
    const id = workflow.slug ?? workflow.id
    setRunsLoading(true)
    try {
      const res = await fetch(`/api/workflows/${id}/runs?limit=30`)
      if (res.ok) setHistoricRuns(await res.json())
    } finally {
      setRunsLoading(false)
    }
  }, [workflow.slug, workflow.id])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleSelectRun = useCallback((run: HistoricRun) => {
    setSelectedRunId(run.id)
    const result = run.output?.result
    setOutputText(typeof result === 'string' ? result : '')
    setShowInputForm(false)
    setLogsTab('history')
  }, [])

  const handleRunAgain = useCallback(() => {
    setShowInputForm(true)
    setSelectedRunId(null)
    setOutputText('')
    setSteps([])
    setFinalOutput(null)
  }, [])

  const handleRun = async () => {
    if (creditBalance != null && creditBalance < 1) {
      setShowNoCreditsModal(true)
      return
    }
    const hasRequired = inputFields.every((f) => !f.required || (inputValues[f.name]?.trim() ?? ''))
    if (!hasRequired) return

    const input = inputFields.length > 0
      ? Object.fromEntries(inputFields.map((f) => [f.name, inputValues[f.name] ?? '']))
      : { default: inputValues['default'] ?? '' }

    setSteps([])
    setFinalOutput(null)
    setOutputText('')
    setLogs([])
    setSelectedRunId(null)
    setShowInputForm(false)
    setIsExecuting(true)
    setCreditsUsed(null)
    abortRef.current = new AbortController()
    const pushLog = (entry: Omit<LogEntry, 'id'>) =>
      setLogs((prev) => [...prev, { id: nextLogId(), ...entry }])

    pushLog({ kind: 'start', summary: 'Run started', ts: Date.now() })

    const id = workflow.slug ?? workflow.id
    try {
      const res = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error('Execution failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No stream')

      let buffer = ''
      let reasoningText = ''
      let assistantText = ''
      const reasoningId = `r-${Date.now()}`
      const assistantId = `a-${Date.now()}`

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'reasoning') {
              reasoningText += data.delta ?? ''
              pushLog({ kind: 'reasoning', summary: `Reasoning (${(reasoningText.length / 4).toFixed(0)} tokens)`, ts: Date.now() })
              setSteps((prev) => prev.filter((s) => s.id !== reasoningId).concat({ id: reasoningId, type: 'reasoning', message: reasoningText, timestamp: new Date() }))
            } else if (data.type === 'assistant') {
              assistantText += data.delta ?? ''
              setOutputText(assistantText)
              setSteps((prev) => prev.filter((s) => s.id !== assistantId).concat({ id: assistantId, type: 'thinking', message: assistantText, timestamp: new Date() }))
            } else if (data.type === 'tool') {
              const label = TOOL_LABELS[data.tool] ?? data.tool
              if (data.status === 'running') {
                pushLog({ kind: 'tool_start', summary: `${label}`, ts: Date.now() })
              } else {
                pushLog({ kind: 'tool_end', summary: `${label} — ${data.status}`, ts: Date.now() })
              }
              const tid = `tool-${data.tool}-${data.timestamp}`
              setSteps((prev) => {
                const rest = prev.filter((s) => s.id !== tid)
                return rest.concat({
                  id: tid,
                  type: 'tool',
                  message: label,
                  timestamp: new Date(),
                  toolData: { name: label, state: data.status, input: data.input, output: data.output },
                })
              })
            } else if (data.type === 'complete') {
              setFinalOutput(data.result)
              const resultText = (data.result?.output?.result ?? data.result?.result) ?? ''
              if (resultText) {
                assistantText = resultText
                setOutputText(resultText)
              }
              pushLog({ kind: 'done', summary: 'Run completed', ts: Date.now() })
              setSteps((prev) => prev.filter((s) => s.id !== assistantId).concat({ id: assistantId, type: 'thinking', message: assistantText, timestamp: new Date() }))
            } else if (data.type === 'credits_used') {
              setCreditsUsed(data.creditsUsed ?? 0)
              setCreditBalance(data.balanceAfter ?? null)
              pushLog({ kind: 'credits', summary: `${data.creditsUsed ?? 0} credits used`, ts: Date.now() })
              setSteps((prev) => prev.concat({ id: `c-${Date.now()}`, type: 'credits', message: `${data.creditsUsed ?? 0} credits used`, timestamp: new Date() }))
            } else if (data.type === 'error') {
              pushLog({ kind: 'error', summary: data.error ?? 'Error', ts: Date.now() })
              setSteps((prev) => prev.concat({ id: `e-${Date.now()}`, type: 'error', message: data.error ?? 'Error', timestamp: new Date() }))
            }
          } catch {
            // ignore parse
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = (e as Error).message
      pushLog({ kind: 'error', summary: msg, ts: Date.now() })
      setSteps((prev) => prev.concat({ id: `e-${Date.now()}`, type: 'error', message: msg, timestamp: new Date() }))
    } finally {
      setIsExecuting(false)
      abortRef.current = null
      setTimeout(fetchHistory, 1500)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Panel 1: Main canvas — input form (before run) OR output + steps (during/after run) + Run again */}
          <ResizablePanel defaultSize={70} minSize={50} maxSize={85} className="flex flex-col min-w-0">
            <div className="flex h-full flex-col border-r border-border bg-muted/5 overflow-hidden">
              <div className="shrink-0 border-b border-border px-4 py-2">
                <h2 className="text-sm font-semibold text-foreground">Canvas</h2>
                <p className="text-xs text-muted-foreground">
                  {showInputForm ? 'Enter inputs and run the workflow.' : 'Results appear here as the workflow runs.'}
                </p>
              </div>
              <div ref={outputScrollRef} className="flex-1 overflow-y-auto overflow-x-auto p-4">
                {showInputForm ? (
                  <div className="max-w-xl mx-auto py-6 space-y-6">
                    {inputFields.length > 0 ? (
                      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">Inputs</p>
                        {inputFields.map((field) => (
                          <div key={field.name}>
                            <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                            {field.type === 'textarea' ? (
                              <textarea
                                value={inputValues[field.name] ?? ''}
                                onChange={(e) => setInputValues((v) => ({ ...v, [field.name]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                rows={3}
                              />
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={inputValues[field.name] ?? ''}
                                onChange={(e) => setInputValues((v) => ({ ...v, [field.name]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              />
                            )}
                          </div>
                        ))}
                        <Button onClick={handleRun} disabled={isExecuting || !inputFields.every((f) => !f.required || (inputValues[f.name]?.trim() ?? ''))} className="rounded-lg w-full">
                          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                          <span className="ml-2">{buttonLabel}</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-card p-4">
                        <Button onClick={handleRun} disabled={isExecuting} className="rounded-lg w-full">
                          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                          <span className="ml-2">{buttonLabel}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl">
                    <div ref={scrollRef} className="space-y-3">
                      {steps.map((step) => {
                        if (step.type === 'reasoning') return <ReasoningBlock key={step.id} text={step.message} isStreaming={isExecuting} />
                        if (step.type === 'thinking') return <div key={step.id} className="rounded-lg border border-border/50 bg-muted/10 p-3"><Markdown className="text-sm">{step.message}</Markdown></div>
                        if (step.type === 'tool' && step.toolData) return <Tool key={step.id} name={step.toolData.name} state={step.toolData.state as 'pending' | 'running' | 'completed' | 'error'} input={step.toolData.input} output={step.toolData.output} defaultOpen={false} />
                        if (step.type === 'credits') return <div key={step.id} className="flex items-center gap-2 text-xs text-primary/70"><Coins className="h-3.5 w-3.5" /><span>{step.message}</span></div>
                        if (step.type === 'error') return <div key={step.id} className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3"><XCircle className="h-4 w-4 text-red-500 shrink-0" /><p className="text-sm text-red-600">{step.message}</p></div>
                        return null
                      })}
                      {isExecuting && steps.length > 0 && (
                        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Working on it…</span>
                        </div>
                      )}
                    </div>
                    {outputText ? (
                      <div className="rounded-lg border border-border/50 bg-card p-4 text-[15px] font-medium leading-relaxed [&_.markdown-table-wrapper]:min-w-0">
                        <Markdown>{outputText}</Markdown>
                      </div>
                    ) : !isExecuting && steps.length === 0 && !selectedRunId ? (
                      <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-background/50">
                        <p className="text-sm text-muted-foreground">Run the workflow or pick a past run from History to see results.</p>
                      </div>
                    ) : null}
                    {!isExecuting && (steps.length > 0 || outputText) && (
                      <Button variant="outline" onClick={handleRunAgain} className="rounded-lg">
                        <RotateCcw className="h-4 w-4" />
                        <span className="ml-2">Run again</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border" />

          {/* Panel 3: Logs & History */}
          <ResizablePanel defaultSize={27} minSize={18} maxSize={45} className="flex flex-col min-w-0">
            <div className="flex h-full flex-col border-l border-border overflow-hidden">
              <div className="shrink-0 flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setLogsTab('live')}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${logsTab === 'live' ? 'border-b-2 border-primary text-primary bg-muted/30' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  Execution logs
                </button>
                <button
                  type="button"
                  onClick={() => setLogsTab('history')}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${logsTab === 'history' ? 'border-b-2 border-primary text-primary bg-muted/30' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {logsTab === 'live' ? (
                  <>
                    {(() => {
                      const selectedRun = selectedRunId ? historicRuns.find((r) => r.id === selectedRunId) : null
                      const storedLogs = selectedRun?.output?.logs as { kind?: string; summary?: string; ts?: number }[] | undefined
                      const displayLogs = !isExecuting && selectedRunId && storedLogs?.length ? storedLogs : logs
                      if (displayLogs.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <ScrollText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-xs text-muted-foreground">
                              {selectedRunId ? 'This run has no stored logs.' : 'Run the workflow to see live logs here.'}
                            </p>
                          </div>
                        )
                      }
                      return (
                        <div className="space-y-1.5">
                          {displayLogs.map((entry, i) => {
                            const kind = 'kind' in entry ? (entry as LogEntry).kind : (entry as { kind?: string }).kind ?? 'text'
                            const summary = 'summary' in entry ? (entry as LogEntry).summary : (entry as { summary?: string }).summary ?? ''
                            const id = 'id' in entry ? (entry as LogEntry).id : `stored-${selectedRunId}-${i}`
                            return (
                              <div key={id} className="flex items-center gap-2 rounded-md border border-border/50 bg-card/50 px-2.5 py-1.5 text-[11px]">
                                <span className={`shrink-0 rounded px-1 font-mono font-semibold ${
                                  kind === 'error' ? 'bg-red-500/10 text-red-600' :
                                  String(kind).startsWith('tool') ? 'bg-amber-500/10 text-amber-600' :
                                  kind === 'credits' ? 'bg-primary/10 text-primary' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {String(kind).toUpperCase().replace('_', ' ')}
                                </span>
                                <span className="truncate text-foreground/90">{summary}</span>
                              </div>
                            )
                          })}
                          {isExecuting && (
                            <div className="flex items-center gap-2 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1.5">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-[11px] text-primary">Streaming…</span>
                            </div>
                          )}
                          <div ref={logsEndRef} />
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <>
                    {runsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : historicRuns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <History className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">No past runs yet.</p>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {historicRuns.map((run) => (
                          <li key={run.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectRun(run)}
                              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selectedRunId === run.id ? 'border-primary bg-primary/10' : 'border-border bg-card/50 hover:bg-muted/50'}`}
                            >
                              <span className="block text-xs font-medium text-foreground truncate">
                                {run.started_at ? formatRelativeTime(run.started_at) : new Date(run.created_at).toLocaleString()}
                              </span>
                              <span className="block text-[11px] text-muted-foreground mt-0.5">
                                {run.status} {run.credits_used != null ? `· ${run.credits_used} credits` : ''}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <CreditsPurchaseModalSimple open={showNoCreditsModal} onOpenChange={setShowNoCreditsModal} />
    </div>
  )
}
