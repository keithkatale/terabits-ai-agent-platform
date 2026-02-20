'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
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
}

export function ChatPanel({ agent, onWorkflowUpdate }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialPromptSent = useRef(false)

  // Fetch latest workflow data from Supabase when tools finish
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
      // After the AI finishes, refresh from DB in case tools were called
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-bold text-primary">T</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {"Let's build your AI employee"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Tell me about the role you need filled. What tasks should this AI employee handle? I will ask you questions to understand exactly what you need.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                'I need a customer support agent',
                'Help me create a content writer',
                'Build me a data analysis assistant',
                'I want a task automation bot',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    sendMessage({ text: suggestion })
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => {
            const text = getMessageText(message)
            const displayText = text
              .replace(/\[WORKFLOW_UPDATE\][\s\S]*?\[\/WORKFLOW_UPDATE\]/g, '')
              .trim()

            if (!displayText) return null

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-medium text-primary">T</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'rounded-tr-none bg-primary text-primary-foreground'
                      : 'rounded-tl-none bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {displayText}
                  </p>
                </div>
              </div>
            )
          })}

          {isLoading && messages.length > 0 && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xs font-medium text-primary">T</span>
              </div>
              <div className="rounded-lg rounded-tl-none bg-muted px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what your AI employee should do..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
