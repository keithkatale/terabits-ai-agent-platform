'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { ArrowUp, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Markdown } from '@/components/prompt-kit/markdown'
import { ThinkingBar } from '@/components/prompt-kit/thinking-bar'
import { ToolCall } from '@/components/prompt-kit/tool-call'
import { FeedbackBar } from '@/components/prompt-kit/feedback-bar'
import type { Agent, AgentSkill } from '@/lib/types'
import type { Node, Edge } from '@xyflow/react'

// Tool name to friendly label mapping
const TOOL_LABELS: Record<string, string> = {
  updateAgent: 'Updating agent configuration',
  addWorkflowNodes: 'Building workflow nodes',
  addWorkflowEdges: 'Connecting workflow edges',
  addSkill: 'Adding skill capability',
  saveSystemPrompt: 'Saving system prompt',
  checkPlatformCapabilities: 'Checking platform capabilities',
}

interface ChatPanelProps {
  agent: Agent
  onWorkflowUpdate: (data: {
    nodes?: Node[]
    edges?: Edge[]
    skills?: AgentSkill[]
    agentUpdate?: Partial<Agent>
  }) => void
  isFullWidth: boolean
}

export function ChatPanel({ agent, onWorkflowUpdate, isFullWidth }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialPromptSent = useRef(false)

  const refreshWorkflow = useCallback(async () => {
    const supabase = createClient()
    const [{ data: nodes }, { data: edges }, { data: skills }, { data: agentData }] = await Promise.all([
      supabase.from('workflow_nodes').select('*').eq('agent_id', agent.id),
      supabase.from('workflow_edges').select('*').eq('agent_id', agent.id),
      supabase.from('agent_skills').select('*').eq('agent_id', agent.id),
      supabase.from('agents').select('*').eq('id', agent.id).single(),
    ])

    const flowNodes: Node[] = (nodes ?? []).map((n) => ({
      id: n.node_id,
      type: n.node_type,
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.label, ...n.data },
    }))

    const flowEdges: Edge[] = (edges ?? []).map((e) => ({
      id: e.edge_id,
      source: e.source_node_id,
      target: e.target_node_id,
      label: e.label ?? undefined,
      type: e.edge_type ?? 'smoothstep',
      animated: true,
    }))

    onWorkflowUpdate({
      nodes: flowNodes.length > 0 ? flowNodes : undefined,
      edges: flowEdges.length > 0 ? flowEdges : undefined,
      skills: skills ?? undefined,
      agentUpdate: agentData ?? undefined,
    })
  }, [agent.id, onWorkflowUpdate])

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent-builder',
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: {
          messages: msgs,
          id,
          agentId: agent.id,
          agentPhase: agent.conversation_phase,
          agentName: agent.name,
          agentCategory: agent.category,
        },
      }),
    }),
    onFinish: () => {
      refreshWorkflow()
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-send initial prompt from landing page
  useEffect(() => {
    if (initialPromptSent.current) return
    const storedPrompt = sessionStorage.getItem('terabits_initial_prompt')
    if (storedPrompt && messages.length === 0 && status === 'ready') {
      initialPromptSent.current = true
      sessionStorage.removeItem('terabits_initial_prompt')
      sendMessage({ text: storedPrompt })
    }
  }, [messages.length, status, sendMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const containerClass = isFullWidth
    ? 'mx-auto w-full max-w-2xl px-4 lg:px-0'
    : 'w-full px-4'

  return (
    <div className="relative flex h-full flex-col">
      {/* Messages area -- fills space, scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-36">
        {messages.length === 0 ? (
          /* Empty state -- Claude-like centered greeting */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className={containerClass}>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground text-balance">
                    {"What role do you need filled?"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {"Describe the AI employee you want to hire. I'll ask questions to understand exactly what you need, then build it for you."}
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Customer support agent for my online store',
                    'Weekly content writer for social media',
                    'Data analysis assistant for sales reports',
                    'Task automation bot for invoice processing',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage({ text: suggestion })}
                      className="rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Messages list with Prompt Kit rendering */
          <div className={`py-6 ${containerClass}`}>
            <div className="space-y-5">
              {messages.map((message, messageIndex) => {
                // Extract text parts
                const textParts = (message.parts ?? [])
                  .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p) => p.text)
                  .join('')
                  .replace(/\[WORKFLOW_UPDATE\][\s\S]*?\[\/WORKFLOW_UPDATE\]/g, '')
                  .trim()

                // Extract tool invocations
                const toolParts = (message.parts ?? []).filter(
                  (p): p is { type: 'tool-invocation'; toolInvocation: { toolName: string; state: string; args: Record<string, unknown>; result?: Record<string, unknown> } } =>
                    p.type === 'tool-invocation'
                )

                const hasContent = textParts || toolParts.length > 0

                if (!hasContent) return null

                // User message
                if (message.role === 'user') {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{textParts}</p>
                      </div>
                    </div>
                  )
                }

                // Assistant message -- rich rendering with Prompt Kit
                const isLastAssistant = messageIndex === messages.length - 1 && message.role === 'assistant'
                const isStreaming = isLastAssistant && (status === 'streaming' || status === 'submitted')

                return (
                  <div key={message.id} className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">T</span>
                    </div>

                    {/* Message content */}
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {/* Tool invocations rendered as ToolCall components */}
                      {toolParts.map((tp, i) => {
                        const inv = tp.toolInvocation
                        const toolState = inv.state === 'result' ? 'completed'
                          : inv.state === 'call' ? 'running'
                          : 'pending'

                        return (
                          <ToolCall
                            key={`${message.id}-tool-${i}`}
                            name={TOOL_LABELS[inv.toolName] ?? inv.toolName}
                            state={toolState as 'pending' | 'running' | 'completed' | 'error'}
                            input={inv.args}
                            output={inv.result as Record<string, unknown> | undefined}
                            defaultOpen={false}
                          />
                        )
                      })}

                      {/* Text content with Markdown rendering */}
                      {textParts && (
                        <Markdown id={message.id}>{textParts}</Markdown>
                      )}

                      {/* Feedback bar -- shown for completed non-streaming assistant messages */}
                      {!isStreaming && textParts && (
                        <FeedbackBar messageContent={textParts} />
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Streaming indicator */}
              {isLoading && messages.length > 0 && (() => {
                const lastMsg = messages[messages.length - 1]
                const lastHasText = (lastMsg?.parts ?? []).some(
                  (p) => p.type === 'text' && (p as { text?: string }).text?.trim()
                )
                // Only show thinking bar if we haven't started getting text yet
                if (!lastHasText || lastMsg?.role === 'user') {
                  return (
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <span className="text-[10px] font-bold text-primary">T</span>
                      </div>
                      <div className="flex-1">
                        <ThinkingBar text="Terabits is thinking" />
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating input -- no container div, just the input itself floating */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-3">
        <div className={`pointer-events-auto w-full ${containerClass}`}>
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-border bg-card shadow-lg backdrop-blur-sm transition-all focus-within:shadow-xl focus-within:border-primary/30">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what your AI employee should do..."
                disabled={isLoading}
                rows={1}
                className="w-full resize-none rounded-2xl bg-transparent px-4 pt-3.5 pb-12 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
              />
              <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground/40">
                  Gemini 3 Flash
                </span>
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
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
