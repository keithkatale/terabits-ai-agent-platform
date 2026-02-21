'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { Button } from '@/components/ui/button'
import { ArrowUp, Sparkles, Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Markdown } from '@/components/prompt-kit/markdown'
import { ThinkingBar } from '@/components/prompt-kit/thinking-bar'
import { ToolCall } from '@/components/prompt-kit/tool-call'
import type { Agent } from '@/lib/types'

const TOOL_LABELS: Record<string, string> = {
  saveInstructions: 'Writing agent instructions',
}

interface ChatPanelProps {
  agent: Agent
  onAgentUpdate: (updates: Partial<Agent>) => void
  isFullWidth: boolean
}

// Extract tool invocation from a message part
function getToolInvocation(part: unknown): {
  toolName: string
  toolCallId: string
  state: string
  input?: unknown
  output?: unknown
} | null {
  if (!part || typeof part !== 'object') return null
  const p = part as Record<string, unknown>

  if (p.toolInvocation && typeof p.toolInvocation === 'object') {
    const inv = p.toolInvocation as Record<string, unknown>
    return {
      toolName: String(inv.toolName ?? ''),
      toolCallId: String(inv.toolCallId ?? ''),
      state: String(inv.state ?? 'unknown'),
      input: inv.input ?? inv.args,
      output: inv.output ?? inv.result,
    }
  }

  if (typeof p.type === 'string' && p.type === 'tool-invocation') {
    const inv = p.toolInvocation as Record<string, unknown> | undefined
    if (inv) {
      return {
        toolName: String(inv.toolName ?? ''),
        toolCallId: String(inv.toolCallId ?? ''),
        state: String(inv.state ?? 'unknown'),
        input: inv.input ?? inv.args,
        output: inv.output ?? inv.result,
      }
    }
  }

  return null
}

// Collapsible reasoning block for Gemini thinking tokens
function ReasoningBlock({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [open, setOpen] = useState(isStreaming)

  useEffect(() => {
    setOpen(isStreaming)
  }, [isStreaming])

  if (!text) return null

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="h-3 w-3 shrink-0" />
        <span className="font-medium">Reasoning</span>
        {isStreaming && (
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        )}
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-3 py-2.5 text-muted-foreground/70 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-[11px]">
          {text}
        </div>
      )}
    </div>
  )
}

export function ChatPanel({ agent, onAgentUpdate, isFullWidth }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialPromptSent = useRef(false)
  const processedToolCalls = useRef<Set<string>>(new Set())
  const messagesLoadedRef = useRef(false)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent-builder',
        prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
          body: {
            id,
            messages: msgs,
            agentId: agent.id,
            agentName: agent.name,
            agentCategory: agent.category,
          },
        }),
      }),
    [agent.id, agent.name, agent.category],
  )

  const { messages, sendMessage, status, setMessages } = useChat({ transport })

  const prevStatusRef = useRef(status)

  // ── Load messages from DB on mount ──────────────────────────────────────────
  useEffect(() => {
    if (messagesLoadedRef.current) return

    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('id, role, content')
        .eq('agent_id', agent.id)
        .eq('message_type', 'builder')
        .order('created_at', { ascending: true })
        .limit(50)

      if (data && data.length > 0) {
        const uiMessages: UIMessage[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: msg.content }],
        }))
        setMessages(uiMessages)
        messagesLoadedRef.current = true
      }
    }

    if (messages.length === 0 && status === 'ready') {
      load()
    }
  }, [agent.id, messages.length, status, setMessages])

  // ── Save assistant messages to DB ───────────────────────────────────────────
  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return

    const save = async () => {
      const supabase = createClient()

      for (const message of messages) {
        if (message.role !== 'assistant') continue

        const text = (message.parts ?? [])
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('')

        if (!text) continue

        // Skip if already saved
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('agent_id', agent.id)
          .eq('role', 'assistant')
          .eq('content', text)
          .eq('message_type', 'builder')
          .single()

        if (!existing) {
          await supabase.from('messages').insert({
            agent_id: agent.id,
            role: 'assistant',
            content: text,
            message_type: 'builder',
            metadata: {},
          })
        }
      }
    }

    save()
  }, [messages, status, agent.id])

  // ── Process tool results ─────────────────────────────────────────────────────
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant' || !message.parts) continue

      for (const part of message.parts) {
        const inv = getToolInvocation(part)
        if (!inv || inv.state !== 'output-available') continue

        const callId = inv.toolCallId
        if (!callId || processedToolCalls.current.has(callId)) continue
        processedToolCalls.current.add(callId)

        let out: Record<string, unknown>
        try {
          const raw = inv.output
          if (!raw) continue
          out = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>)
        } catch {
          continue
        }

        // saveInstructions succeeded — push updates to parent
        if (inv.toolName === 'saveInstructions' && out.success && out.__agentUpdate) {
          onAgentUpdate(out.__agentUpdate as Partial<Agent>)
        }
      }
    }
  }, [messages, onAgentUpdate])

  // ── Refresh agent from DB after streaming completes ──────────────────────────
  useEffect(() => {
    const wasWorking =
      prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    const isNowReady = status === 'ready'
    prevStatusRef.current = status

    if (wasWorking && isNowReady) {
      const refresh = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from('agents')
          .select(
            'name, description, category, instruction_prompt, execution_context, tool_config, status, conversation_phase',
          )
          .eq('id', agent.id)
          .single()
        if (data) onAgentUpdate(data)
      }
      refresh()
    }
  }, [status, agent.id, onAgentUpdate])

  // ── Auto-send initial prompt from landing page ───────────────────────────────
  useEffect(() => {
    if (initialPromptSent.current) return
    const stored = sessionStorage.getItem('terabits_initial_prompt')
    if (stored && messages.length === 0 && status === 'ready') {
      initialPromptSent.current = true
      sessionStorage.removeItem('terabits_initial_prompt')
      sendMessage({ text: stored })
    }
  }, [messages.length, status, sendMessage])

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = textareaRef.current
    if (t) {
      t.style.height = 'auto'
      t.style.height = `${Math.min(t.scrollHeight, 160)}px`
    }
  }, [inputValue])

  // ── Submit handler ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || status !== 'ready') return

    const text = inputValue
    setInputValue('')

    const supabase = createClient()
    await supabase.from('messages').insert({
      agent_id: agent.id,
      role: 'user',
      content: text,
      message_type: 'builder',
      metadata: {},
    })

    sendMessage({ text })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const containerClass = isFullWidth ? 'mx-auto w-full max-w-2xl px-4' : 'w-full px-4'
  const isWorking = status === 'submitted' || status === 'streaming'

  return (
    <div className="relative flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-36">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className={containerClass}>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    What should your agent do?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Describe the task and I'll write the instructions that power it.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Customer support agent for my online store',
                    'Weekly content writer for social media',
                    'Research assistant that summarises articles',
                    'Invoice processing automation',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInputValue(s)}
                      className="rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`py-6 ${containerClass}`}>
            <div className="space-y-5">
              {messages.map((message: UIMessage) => {
                // User message
                if (message.role === 'user') {
                  const text = (message.parts ?? [])
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join('')
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
                      </div>
                    </div>
                  )
                }

                // Assistant message
                const parts = message.parts ?? []
                return (
                  <div key={message.id} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">T</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {parts.map((part: any, i: number) => {
                        // Reasoning tokens
                        if (part.type === 'reasoning') {
                          return (
                            <ReasoningBlock
                              key={i}
                              text={String(part.reasoning ?? part.text ?? '')}
                              isStreaming={isWorking && i === parts.length - 1}
                            />
                          )
                        }

                        // Tool invocations
                        const inv = getToolInvocation(part)
                        if (inv) {
                          const toolState =
                            inv.state === 'output-available'
                              ? 'completed'
                              : inv.state === 'output-error'
                                ? 'error'
                                : 'running'
                          return (
                            <ToolCall
                              key={i}
                              name={TOOL_LABELS[inv.toolName] ?? inv.toolName}
                              state={toolState as 'pending' | 'running' | 'completed' | 'error'}
                              defaultOpen={false}
                            />
                          )
                        }

                        // Text
                        if (part.type === 'text' && part.text) {
                          return (
                            <Markdown key={i} id={`${message.id}-${i}`}>
                              {String(part.text)}
                            </Markdown>
                          )
                        }

                        return null
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Thinking indicator */}
              {isWorking && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-[10px] font-bold text-primary">T</span>
                  </div>
                  <div className="flex-1">
                    <ThinkingBar text="Working on your agent" />
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating input */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-3">
        <div className={`pointer-events-auto w-full ${containerClass}`}>
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-border bg-card shadow-lg backdrop-blur-sm transition-all focus-within:border-primary/30 focus-within:shadow-xl">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what your agent should do..."
                disabled={status !== 'ready'}
                rows={1}
                className="w-full resize-none rounded-2xl bg-transparent px-4 pt-3.5 pb-12 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
              />
              <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground/40">Gemini 3 Flash</span>
                <Button
                  type="submit"
                  size="icon"
                  disabled={status !== 'ready' || !inputValue.trim()}
                  className="h-7 w-7 rounded-lg"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/40">
            Terabits AI can make mistakes. Review your agent before deploying.
          </p>
        </div>
      </div>
    </div>
  )
}
