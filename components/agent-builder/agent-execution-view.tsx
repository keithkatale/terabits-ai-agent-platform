'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles, Play, Square, Wrench, ArrowUp, Brain, ChevronDown, ChevronRight, Coins } from 'lucide-react'
import type { Agent } from '@/lib/types'
import { ToolCall } from '@/components/prompt-kit/tool-call'
import { Markdown } from '@/components/prompt-kit/markdown'
import { toast } from 'sonner'
import { CreditsPurchaseModalSimple } from '@/components/dashboard/credits-purchase-modal-simple'

// Friendly tool labels
const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web',
  web_scrape: 'Scraping website content',
  ai_process: 'Analyzing information',
  read: 'Reading content',
  write: 'Writing data',
}

interface AgentExecutionViewProps {
  agent: Agent
  isRunning: boolean
  onStop: () => void
  triggerConfig?: {
    inputFields?: Array<{
      name: string
      label: string
      type: 'text' | 'number' | 'url' | 'textarea'
      placeholder?: string
      required?: boolean
    }>
    buttonLabel?: string
  }
}

interface ExecutionStep {
  id: string
  type: 'thinking' | 'reasoning' | 'action' | 'result' | 'error' | 'tool' | 'credits'
  message: string
  timestamp: Date
  details?: string
  toolData?: {
    name: string
    state: 'pending' | 'running' | 'completed' | 'error'
    input?: any
    output?: any
  }
}

// Collapsible reasoning block for the execution logs panel
function ReasoningBlockExec({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [open, setOpen] = useState(isStreaming)

  useEffect(() => {
    setOpen(isStreaming)
  }, [isStreaming])

  if (!text) return null

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-violet-600 hover:text-violet-700 transition-colors"
      >
        <Brain className="h-3 w-3 shrink-0" />
        <span className="font-medium">Agent reasoning</span>
        {isStreaming && (
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
        )}
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-violet-500/20 px-3 py-2.5 text-muted-foreground/70 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-[11px]">
          {text}
        </div>
      )}
    </div>
  )
}

export function AgentExecutionView({ agent, isRunning, onStop, triggerConfig }: AgentExecutionViewProps) {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'logs' | 'result'>('logs')
  const [finalOutput, setFinalOutput] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null)
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [steps])

  // Fetch credit balance on component mount
  useEffect(() => {
    fetch('/api/user/credits')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCreditBalance(data.balance?.balance ?? 0)
        }
      })
      .catch(() => {})
  }, [])

  const handleExecute = async () => {
    // Check credits before execution
    if (creditBalance !== null && creditBalance < 1) {
      setShowNoCreditsModal(true)
      return
    }

    // Reset state for new execution
    setSteps([])
    setFinalOutput(null)
    setActiveTab('logs')
    setIsExecuting(true)
    setCreditsUsed(null)

    // Validate required fields
    const hasRequiredFields = triggerConfig?.inputFields?.every(field =>
      !field.required || inputValues[field.name]?.trim()
    ) ?? true

    if (!hasRequiredFields) {
      setIsExecuting(false)
      return
    }

    // Build input object from configured fields
    const input = triggerConfig?.inputFields
      ? Object.fromEntries(
        triggerConfig.inputFields.map(field => [field.name, inputValues[field.name] || ''])
      )
      : { task: inputValues['default'] || '' }

    // Add user input step
    const userStep: ExecutionStep = {
      id: Date.now().toString(),
      type: 'action',
      message: `Starting task with requested inputs`,
      timestamp: new Date(),
    }
    setSteps((prev) => [...prev, userStep])

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const response = await fetch(`/api/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          stream: true
        }),
        signal,
      })

      if (!response.ok) throw new Error('Execution failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''
        let currentAssistantText = ''
        let currentReasoningText = ''
        let assistantStepId = `assistant-${Date.now()}`
        const reasoningStepId = `reasoning-${Date.now()}`

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'reasoning') {
                  // Stream reasoning tokens in real-time
                  currentReasoningText += data.delta || ''
                  setSteps(prev => {
                    const others = prev.filter(s => s.id !== reasoningStepId)
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
                } else if (data.type === 'assistant') {
                  currentAssistantText += data.delta || ''
                  setSteps(prev => {
                    const others = prev.filter(s => s.id !== assistantStepId)
                    return [...others, {
                      id: assistantStepId,
                      type: 'thinking',
                      message: currentAssistantText,
                      timestamp: new Date()
                    }]
                  })
                } else if (data.type === 'tool') {
                  const toolCallId = `tool-${data.tool}-${data.timestamp}`
                  setSteps(prev => {
                    const others = prev.filter(s => s.id !== toolCallId)
                    return [...others, {
                      id: toolCallId,
                      type: 'tool',
                      message: TOOL_LABELS[data.tool] || data.tool,
                      timestamp: new Date(),
                      toolData: {
                        name: TOOL_LABELS[data.tool] || data.tool,
                        state: data.status,
                        input: data.input,
                        output: data.output
                      }
                    }]
                  })
                  // If tool completed, start a new assistant block
                  if (data.status === 'completed') {
                    currentAssistantText = ''
                    assistantStepId = `assistant-${Date.now()}`
                  }
                } else if (data.type === 'complete') {
                  setSteps(prev => [...prev, {
                    id: `complete-${Date.now()}`,
                    type: 'result',
                    message: 'Task completed',
                    timestamp: new Date()
                  }])

                  if (data.result?.output) {
                    setFinalOutput(data.result.output)
                    setActiveTab('result')
                  } else if (data.result) {
                    setFinalOutput(data.result)
                    setActiveTab('result')
                  }
                } else if (data.type === 'error') {
                  setSteps(prev => [...prev, {
                    id: `error-${Date.now()}`,
                    type: 'error',
                    message: data.error || 'An error occurred',
                    timestamp: new Date()
                  }])
                } else if (data.type === 'credits_used') {
                  setCreditsUsed(data.creditsUsed)
                  setCreditBalance(data.balanceAfter)
                  // Append credit summary step to logs
                  setSteps(prev => [...prev, {
                    id: `credits-${Date.now()}`,
                    type: 'credits',
                    message: `${data.creditsUsed} credit${data.creditsUsed !== 1 ? 's' : ''} used · ${data.balanceAfter} remaining`,
                    timestamp: new Date(),
                  }])
                  // Show warning toast if balance is now 0
                  if (data.balanceAfter < 1) {
                    toast.error("You've used all your credits", {
                      description: "Purchase more to keep running agents.",
                      action: { label: "Buy Credits", onClick: () => setShowNoCreditsModal(true) },
                    })
                  } else if (data.balanceAfter < 10) {
                    toast.warning(`Low credits: ${data.balanceAfter} remaining`)
                  }
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (isAbort) {
        setSteps(prev => [...prev, {
          id: `stopped-${Date.now()}`,
          type: 'error',
          message: 'Run stopped. Credits used have been applied.',
          timestamp: new Date()
        }])
        toast.info('Run stopped. Credits used have been applied.')
      } else {
        setSteps(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'error',
          message: error instanceof Error ? error.message : 'Something went wrong',
          timestamp: new Date()
        }])
      }
    } finally {
      setIsExecuting(false)
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    onStop()
  }

  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'reasoning':
        return <Brain className="h-3.5 w-3.5 text-violet-400" />
      case 'thinking':
        return <Sparkles className="h-4 w-4 text-blue-500" />
      case 'tool':
        return <Wrench className="h-3.5 w-3.5 text-amber-500" />
      case 'action':
        return <Play className="h-4 w-4 text-primary" />
      case 'result':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const renderResult = (data: any) => {
    if (!data) return null

    // For plain strings or simple objects with 'result' field
    if (typeof data === 'string') return <Markdown>{data}</Markdown>
    if (data.result && typeof data.result === 'string' && Object.keys(data).length === 1) {
      return <Markdown>{data.result}</Markdown>
    }

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'result' && typeof value === 'string') {
            return (
              <div key={key} className="rounded-lg border border-border bg-muted/20 p-4">
                <Markdown>{value as string}</Markdown>
              </div>
            )
          }

          if (Array.isArray(value)) {
            return (
              <div key={key} className="space-y-2">
                <h4 className="text-sm font-semibold capitalize text-foreground">{key.replace(/_/g, ' ')}</h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(value[0] || {}).map((col) => (
                          <th key={col} className="px-3 py-2 font-medium capitalize">{col.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {value.map((item, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          {Object.values(item || {}).map((val: any, j) => (
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{key.replace(/_/g, ' ')}</h4>
              <div className="rounded-lg bg-muted/40 p-3 text-sm text-foreground">
                <Markdown>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</Markdown>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Agent Execution</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Watch your agent work in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits counter */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              {isExecuting ? (
                <span className="animate-pulse">Counting credits...</span>
              ) : creditsUsed !== null ? (
                <span>{creditsUsed} used · <span className={creditBalance === 0 ? 'text-red-500 font-medium' : ''}>{creditBalance} left</span></span>
              ) : creditBalance !== null ? (
                <span>{creditBalance} credits</span>
              ) : null}
            </div>
            {/* Stop Agent button */}
            {isRunning && (
              <Button variant="destructive" size="sm" onClick={handleStop}>
                <Square className="mr-2 h-4 w-4" />
                Stop Agent
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Execution Content with Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Toggle */}
        {(isExecuting || steps.length > 0) && (
          <div className="flex border-b border-border bg-muted/20 px-6 py-2 gap-4">
            <button
              onClick={() => setActiveTab('logs')}
              className={`text-xs font-medium pb-1 border-b-2 transition-colors ${activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Execution Logs
            </button>
            <button
              onClick={() => setActiveTab('result')}
              disabled={!finalOutput}
              className={`text-xs font-medium pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'result' ? 'border-primary text-primary' : (finalOutput ? 'border-transparent text-muted-foreground hover:text-foreground' : 'border-transparent text-muted-foreground/40 cursor-not-allowed')
                }`}
            >
              Final Result
              {finalOutput && <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {steps.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="w-full">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h4 className="mt-4 text-xl font-bold text-foreground">Hiring {agent.name}</h4>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Provide the details below to start the mission.
                </p>

                {/* Centered Input Form */}
                <div className="mt-10 w-full max-w-md mx-auto text-left space-y-6">
                  {triggerConfig?.inputFields && triggerConfig.inputFields.length > 0 ? (
                    <div className="space-y-5">
                      {triggerConfig.inputFields.map((field) => (
                        <div key={field.name}>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={inputValues[field.name] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              rows={4}
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={inputValues[field.name] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          )}
                        </div>
                      ))}
                      <Button
                        onClick={handleExecute}
                        disabled={!triggerConfig.inputFields.every(f => !f.required || inputValues[f.name]?.trim())}
                        className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {triggerConfig.buttonLabel || `Run ${agent.name}`}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={inputValues['default'] || ''}
                          onChange={(e) => setInputValues({ default: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                          placeholder="What should I do first?"
                          className="w-full py-4 pl-4 pr-12 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          onClick={handleExecute}
                          className="absolute right-2 top-2 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'result' && finalOutput ? (
            <div className="w-full">
              {renderResult(finalOutput)}
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {steps.map((step) => {
                // Reasoning block — collapsible, with streaming indicator
                if (step.type === 'reasoning') {
                  return (
                    <ReasoningBlockExec
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
                      <div className="mt-1 shrink-0">{getStepIcon(step.type)}</div>
                      <div className="flex-1 min-w-0">
                        <Markdown className="text-sm leading-relaxed text-muted-foreground italic">
                          {step.message}
                        </Markdown>
                      </div>
                    </div>
                  )
                }

                if (step.type === 'result') {
                  return (
                    <div key={step.id} className="flex items-center gap-2 px-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{step.message}</span>
                    </div>
                  )
                }

                if (step.type === 'error') {
                  return (
                    <div key={step.id} className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 leading-relaxed">{step.message}</p>
                    </div>
                  )
                }

                if (step.type === 'credits') {
                  return (
                    <div key={step.id} className="flex items-center gap-2 px-1 text-xs text-primary/70">
                      <Coins className="h-3.5 w-3.5" />
                      <span>{step.message}</span>
                    </div>
                  )
                }

                return (
                  <div key={step.id} className="flex items-start gap-3 px-1">
                    <div className="mt-0.5 shrink-0">{getStepIcon(step.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-relaxed">{step.message}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/50">
                        <Clock className="h-2.5 w-2.5" />
                        {step.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )
              })}
              {isExecuting && (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/10 bg-primary/5 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-[10px] font-medium text-primary uppercase tracking-tight">AI is working...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Area - Only show if not empty state */}
      {steps.length > 0 && (
        <div className="border-t border-border bg-card p-6">
          {triggerConfig?.inputFields && triggerConfig.inputFields.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-muted-foreground truncate">
                  Mission active with inputs: {Object.values(inputValues).filter(Boolean).join(', ')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSteps([])
                  setFinalOutput(null)
                  setActiveTab('logs')
                }}
              >
                Reset Mission
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 max-w-2xl mx-auto w-full">
              <input
                type="text"
                value={inputValues['default'] || ''}
                onChange={(e) => setInputValues({ default: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                placeholder="Send a message to your agent..."
                disabled={isExecuting}
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-muted/20"
              />
              <Button onClick={handleExecute} disabled={!inputValues['default']?.trim() || isExecuting} className="rounded-xl">
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      <CreditsPurchaseModalSimple
        isOpen={showNoCreditsModal}
        onOpenChange={setShowNoCreditsModal}
      />
    </div>
  )
}
