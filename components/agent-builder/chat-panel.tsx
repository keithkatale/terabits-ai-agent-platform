'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { ArrowUp, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Agent, AgentSkill } from '@/lib/types'
import type { Node, Edge } from '@xyflow/react'

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
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

  // The container classes: full-width gets centered max-width like Claude, sidebar mode gets full
  const containerClass = isFullWidth
    ? 'mx-auto w-full max-w-2xl px-4 lg:px-0'
    : 'w-full px-4'

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty state -- Claude-like centered greeting */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className={containerClass}>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {"What role do you need filled?"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {"Describe the AI employee you want to hire. I'll ask questions to understand exactly what you need, then build it for you."}
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'I need a customer support agent for my online store',
                    'Help me create a weekly content writer',
                    'Build a data analysis assistant for sales reports',
                    'I want a task automation bot for invoice processing',
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
          /* Messages list */
          <div className={`py-6 ${containerClass}`}>
            <div className="space-y-6">
              {messages.map((message) => {
                const text = getMessageText(message)
                const displayText = text
                  .replace(/\[WORKFLOW_UPDATE\][\s\S]*?\[\/WORKFLOW_UPDATE\]/g, '')
                  .trim()

                if (!displayText) return null

                if (message.role === 'user') {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{displayText}</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={message.id} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">T</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{displayText}</p>
                    </div>
                  </div>
                )
              })}

              {isLoading && messages.length > 0 && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-[10px] font-bold text-primary">T</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area -- Claude-like textarea with send button */}
      <div className="border-t border-border bg-background pb-4 pt-3">
        <div className={containerClass}>
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-all focus-within:shadow-md focus-within:border-primary/30">
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
