'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
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
    onFinish: (message) => {
      // Check if the response includes workflow updates via metadata
      const text = getMessageText(message)
      try {
        const workflowMatch = text.match(/\[WORKFLOW_UPDATE\]([\s\S]*?)\[\/WORKFLOW_UPDATE\]/)
        if (workflowMatch) {
          const update = JSON.parse(workflowMatch[1])
          if (update.nodes || update.edges || update.skills || update.agentUpdate) {
            onWorkflowUpdate(update)
          }
        }
      } catch {
        // Not a workflow update message, that's fine
      }
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

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
            // Filter out workflow update metadata from display
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
