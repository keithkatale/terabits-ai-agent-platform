'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

interface RuntimeChatProps {
  agentId: string
  agentName: string
}

export function RuntimeChat({ agentId, agentName }: RuntimeChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agents/${agentId}/run`,
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: {
          messages: msgs,
          id,
          sessionId: id,
        },
      }),
    }),
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
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 pt-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <span className="text-xl font-bold text-primary">T</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{agentName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How can I help you today?
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => {
            const text = getMessageText(message)
            if (!text) return null

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
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
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

      <div className="border-t border-border bg-card px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
