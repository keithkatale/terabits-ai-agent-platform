'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Code2,
  Copy,
  Check,
  FileText,
  Loader2,
  ScrollText,
  Wrench,
  ChevronDown,
  ChevronRight,
  Zap,
  Brain,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Globe,
} from 'lucide-react'
import type { Agent } from '@/lib/types'
import { useAgentExecution, type LogEntry } from './agent-execution-context'
import { ToolsPanel } from './tools-panel'

type ConfigTab = 'instructions' | 'json' | 'logs' | 'tools'

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ElementType }[] = [
  { id: 'instructions', label: 'Instructions', icon: FileText },
  { id: 'json', label: 'JSON', icon: Code2 },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'tools', label: 'Tools', icon: Wrench },
]

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
    <div className={`rounded-lg border border-border ${c.bgColor} overflow-hidden`}>
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-start gap-2.5 px-3 py-2 text-left ${hasDetail ? 'cursor-pointer hover:bg-black/5' : 'cursor-default'}`}
      >
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground/60">{time}</span>
        <span className={`shrink-0 rounded-lg px-1.5 py-0.5 font-mono text-[10px] font-bold ${c.color} ${c.bgColor}`}>
          {c.label}
        </span>
        <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${c.color}`} />
        <span className="flex-1 truncate text-xs text-foreground/80">{entry.summary}</span>
        {hasDetail && (
          <span className="ml-auto shrink-0">
            {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </span>
        )}
      </button>
      {open && entry.detail !== undefined && (
        <div className="border-t border-border/40 px-3 py-2">
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground/70">
            {typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

interface AgentConfigPanelProps {
  agent: Agent
  onAgentUpdate: (updates: Partial<Agent>) => void
}

export function AgentConfigPanel({ agent, onAgentUpdate }: AgentConfigPanelProps) {
  const [tab, setTab] = useState<ConfigTab>('instructions')
  const [copied, setCopied] = useState(false)
  const { logs, isExecuting, setLogs } = useAgentExecution()
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const instructionPrompt = agent.instruction_prompt
  const executionContext = agent.execution_context

  const handleCopy = async () => {
    const text =
      tab === 'instructions'
        ? instructionPrompt ?? ''
        : JSON.stringify(
            { instruction_prompt: instructionPrompt, execution_context: executionContext, tool_config: agent.tool_config },
            null,
            2,
          )
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!instructionPrompt) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No instructions yet</p>
        <p className="text-xs text-muted-foreground">Chat with Terabits to build your agent. Instructions will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          {CONFIG_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
              {id === 'logs' && logs.some((l) => l.kind === 'error') && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
              {id === 'logs' && isExecuting && logs.length > 0 && !logs.some((l) => l.kind === 'error') && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(tab === 'instructions' || tab === 'json') && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {tab === 'logs' && logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {tab === 'instructions' && (
          <div className="h-full w-full min-w-0 overflow-y-auto p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Executor System Prompt</p>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80">{instructionPrompt}</pre>
            </div>
          </div>
        )}
        {tab === 'json' && (
          <div className="h-full w-full min-w-0 overflow-y-auto p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Raw Configuration</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-4 font-mono text-[11px] leading-relaxed text-foreground/80">
              {JSON.stringify({ instruction_prompt: instructionPrompt, execution_context: executionContext, tool_config: agent.tool_config }, null, 2)}
            </pre>
          </div>
        )}
        {tab === 'logs' && (
          <div className="h-full w-full min-w-0 overflow-y-auto p-4">
            {logs.length === 0 ? (
              <div className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <ScrollText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No execution logs yet</p>
                <p className="text-xs text-muted-foreground">Run the agent from the chat area. Events will appear here in real-time.</p>
              </div>
            ) : (
              <div className="w-full min-w-0 space-y-1.5">
                {logs.map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
                {isExecuting && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-[11px] text-primary">Streaming…</span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
        {tab === 'tools' && (
          <div className="h-full w-full min-w-0 overflow-hidden">
            <ToolsPanel agent={agent} onUpdate={(toolConfig) => onAgentUpdate({ tool_config: toolConfig })} />
          </div>
        )}
      </div>
    </div>
  )
}
