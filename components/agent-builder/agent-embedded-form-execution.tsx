'use client'

import { useState, useEffect } from 'react'
import { Play, Loader2, CheckCircle2, XCircle, Brain, ChevronDown, ChevronRight, Sparkles, RotateCcw, AlertTriangle } from 'lucide-react'
import type { Agent } from '@/lib/types'
import { useAgentExecution } from './agent-execution-context'
import { Tool } from '@/components/ai-elements/tool'
import { Markdown } from '@/components/ai-elements/markdown'

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
        <span className="ml-auto">{open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</span>
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
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground/80">
        {JSON.stringify(obj, null, 2)}
      </pre>
    </div>
  )
}

interface AgentEmbeddedFormExecutionProps {
  agent: Agent
}

export function AgentEmbeddedFormExecution({ agent }: AgentEmbeddedFormExecutionProps) {
  const {
    inputValues,
    setInputValues,
    steps,
    isExecuting,
    finalOutput,
    executionError,
    previewView,
    handleExecute,
    handleReset,
  } = useAgentExecution()

  const executionContext = agent.execution_context as {
    triggerConfig?: {
      inputFields?: Array<{ name: string; label: string; type: string; placeholder?: string; required?: boolean }>
      buttonLabel?: string
    }
  } | undefined
  const inputFields = executionContext?.triggerConfig?.inputFields ?? []
  const buttonLabel = executionContext?.triggerConfig?.buttonLabel ?? `Run ${agent.name}`

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-border bg-card/30">
      {/* Form */}
      {previewView === 'form' && (
        <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto px-6 py-6">
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
                        onChange={(e) => setInputValues((p) => ({ ...p, [field.name]: e.target.value }))}
                        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                        className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={inputValues[field.name] || ''}
                        onChange={(e) => setInputValues((p) => ({ ...p, [field.name]: e.target.value }))}
                        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={handleExecute}
                  disabled={!inputFields.every((f) => !f.required || inputValues[f.name]?.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={handleExecute}
                  disabled={!inputValues['default']?.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
      {previewView === 'running' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {steps.map((step) => {
              if (step.type === 'reasoning') {
                return <ReasoningBlock key={step.id} text={step.message} isStreaming={isExecuting} />
              }
              if (step.type === 'tool' && step.toolData) {
                return (
                  <Tool
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
                    <Markdown className="text-sm italic leading-relaxed text-muted-foreground">{step.message}</Markdown>
                  </div>
                )
              }
              if (step.type === 'error') {
                return (
                  <div key={step.id} className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
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
                <div className="flex animate-pulse items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-[10px] font-medium uppercase tracking-tight text-primary">Agent is working…</span>
                </div>
              </div>
            )}
            {!isExecuting && executionError && steps.every((s) => s.type !== 'result') && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
                <XCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
                <p className="text-sm font-medium text-red-600">Execution failed</p>
                <p className="mt-1 text-xs text-red-500/80">{executionError}</p>
              </div>
            )}
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
  )
}
