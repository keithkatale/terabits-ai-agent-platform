'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Agent } from '@/lib/types'
import { TOOL_LABELS as CATALOG_TOOL_LABELS } from '@/lib/tools/labels'

const TOOL_LABELS: Record<string, string> = {
  ...CATALOG_TOOL_LABELS,
  web_search: 'Web search',
  web_scrape: 'Read webpage',
}

export interface ExecutionStep {
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

export interface LogEntry {
  id: string
  kind: 'start' | 'reasoning' | 'text' | 'tool_start' | 'tool_end' | 'error' | 'done' | 'finish'
  summary: string
  detail?: unknown
  ts: number
}

type PreviewView = 'form' | 'running' | 'result'

interface AgentExecutionState {
  inputValues: Record<string, string>
  setInputValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  steps: ExecutionStep[]
  logs: LogEntry[]
  isExecuting: boolean
  finalOutput: unknown
  executionError: string | null
  previewView: PreviewView
  setPreviewView: React.Dispatch<React.SetStateAction<PreviewView>>
  handleExecute: () => Promise<void>
  handleReset: () => void
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
}

const AgentExecutionContext = createContext<AgentExecutionState | null>(null)

export function useAgentExecution() {
  const ctx = useContext(AgentExecutionContext)
  if (!ctx) throw new Error('useAgentExecution must be used within AgentExecutionProvider')
  return ctx
}

let logIdCounter = 0
function nextLogId() {
  return `log-${++logIdCounter}`
}

export function AgentExecutionProvider({
  agent,
  children,
}: {
  agent: Agent
  children: ReactNode
}) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [finalOutput, setFinalOutput] = useState<unknown>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [previewView, setPreviewView] = useState<PreviewView>('form')
  const stepsEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const executionContext = agent.execution_context as {
    triggerConfig?: {
      inputFields?: Array<{ name: string; label: string; type: string; placeholder?: string; required?: boolean }>
      buttonLabel?: string
    }
  } | undefined
  const inputFields = executionContext?.triggerConfig?.inputFields ?? []

  const handleReset = useCallback(() => {
    setSteps([])
    setFinalOutput(null)
    setExecutionError(null)
    setPreviewView('form')
  }, [])

  const handleExecute = useCallback(async () => {
    setSteps([])
    setLogs([])
    setFinalOutput(null)
    setExecutionError(null)
    setIsExecuting(true)
    setPreviewView('running')

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

    const pushLog = (entry: Omit<LogEntry, 'id'>) => {
      setLogs((prev) => [...prev, { id: nextLogId(), ...entry }])
    }

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

          if (t === 'reasoning') {
            const delta = String(data.delta ?? '')
            currentReasoningText += delta
            setSteps((prev) => {
              const others = prev.filter((s) => s.id !== reasoningStepId)
              return [
                { id: reasoningStepId, type: 'reasoning', message: currentReasoningText, timestamp: new Date() },
                ...others,
              ]
            })
            setLogs((prev) => {
              const exists = prev.find((l) => l.id === reasoningLogId)
              if (exists) {
                return prev.map((l) =>
                  l.id === reasoningLogId ? { ...l, summary: `${currentReasoningText.length} chars`, detail: currentReasoningText } : l
                )
              }
              return [...prev, { id: reasoningLogId, kind: 'reasoning', summary: `${currentReasoningText.length} chars`, detail: currentReasoningText, ts: Date.now() }]
            })
          } else if (t === 'assistant') {
            const delta = String(data.delta ?? '')
            currentAssistantText += delta
            setSteps((prev) => {
              const others = prev.filter((s) => s.id !== assistantStepId)
              return [...others, { id: assistantStepId, type: 'thinking', message: currentAssistantText, timestamp: new Date() }]
            })
            const preview = currentAssistantText.slice(0, 120)
            setLogs((prev) => {
              const exists = prev.find((l) => l.id === textLogId)
              if (exists) {
                return prev.map((l) => (l.id === textLogId ? { ...l, summary: preview, detail: currentAssistantText } : l))
              }
              return [...prev, { id: textLogId, kind: 'text', summary: preview, detail: currentAssistantText, ts: Date.now() }]
            })
          } else if (t === 'tool') {
            const toolName = String(data.tool ?? '')
            const toolLabel = TOOL_LABELS[toolName] ?? toolName
            const status = String(data.status ?? '')
            const toolStepId = `tool-${toolName}-${data.stepIndex ?? 0}`

            if (status === 'running') {
              setSteps((prev) => {
                const others = prev.filter((s) => s.id !== toolStepId)
                return [...others, { id: toolStepId, type: 'tool', message: toolLabel, timestamp: new Date(), toolData: { name: toolLabel, state: 'running', input: data.input as Record<string, unknown> | undefined } }]
              })
              pushLog({ kind: 'tool_start', summary: `${toolLabel}: ${JSON.stringify(data.input ?? {}).slice(0, 80)}`, detail: data.input, ts: Number(data.timestamp ?? Date.now()) })
              currentAssistantText = ''
              assistantStepId = `assistant-${Date.now()}`
              textLogId = nextLogId()
            } else if (status === 'completed') {
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === toolStepId
                    ? { ...s, toolData: { name: toolLabel, state: 'completed', input: data.input as Record<string, unknown> | undefined, output: data.output as Record<string, unknown> | undefined } }
                    : s
                )
              )
              pushLog({ kind: 'tool_end', summary: `${toolLabel} returned ${JSON.stringify(data.output ?? {}).slice(0, 80)}`, detail: data.output, ts: Number(data.timestamp ?? Date.now()) })
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
              setPreviewView('result')
              pushLog({ kind: 'done', summary: 'Execution complete', ts: Date.now() })
            } else {
              const emptyMsg = 'Agent completed but produced no output. Check the Logs tab for tool activity.'
              setExecutionError(emptyMsg)
              setSteps((prev) => [...prev, { id: `error-${Date.now()}`, type: 'error', message: emptyMsg, timestamp: new Date() }])
              pushLog({ kind: 'error', summary: emptyMsg, ts: Date.now() })
            }
          } else if (t === 'finish') {
            const usage = data.usage as { totalTokens?: number } | undefined
            pushLog({ kind: 'finish', summary: usage?.totalTokens ? `${usage.totalTokens} tokens used` : `Finish: ${data.finishReason ?? 'stop'}`, detail: { finishReason: data.finishReason, usage: data.usage }, ts: Date.now() })
          } else if (t === 'start') {
            pushLog({ kind: 'start', summary: `Running ${agent.name}…`, ts: Date.now() })
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Execution failed'
      setExecutionError(msg)
      setSteps((prev) => [...prev, { id: `error-${Date.now()}`, type: 'error', message: msg, timestamp: new Date() }])
      pushLog({ kind: 'error', summary: msg, detail: msg, ts: Date.now() })
    } finally {
      setIsExecuting(false)
    }
  }, [agent.id, agent.name, inputFields, inputValues])

  const value: AgentExecutionState = {
    inputValues,
    setInputValues,
    steps,
    logs,
    isExecuting,
    finalOutput,
    executionError,
    previewView,
    setPreviewView,
    handleExecute,
    handleReset,
    setLogs,
  }

  return (
    <AgentExecutionContext.Provider value={value}>
      {children}
    </AgentExecutionContext.Provider>
  )
}
