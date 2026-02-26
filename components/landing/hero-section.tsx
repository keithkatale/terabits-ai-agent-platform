'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Briefcase, MessageSquare, BarChart3, Clock, Search, Sparkles, Loader2 } from 'lucide-react'

const suggestions = [
  { icon: Search, label: 'Search', prompt: 'Search the web for the latest news on AI agents' },
  { icon: MessageSquare, label: 'Email', prompt: 'Send an email to remind me about the meeting tomorrow' },
  { icon: BarChart3, label: 'Research', prompt: 'Find 5 competitors for project management software' },
  { icon: Briefcase, label: 'Summarise', prompt: 'Summarise this article for me: [paste URL]' },
  { icon: Clock, label: 'Task', prompt: 'Look up the weather in London and tell me if I need an umbrella' },
]

export function HeroSection() {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(promptText?: string) {
    const text = promptText || input
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    // Send user to the assistant chat; optional: pass initial message via query
    const params = new URLSearchParams()
    if (text.trim()) params.set('q', text.trim().slice(0, 500))
    router.push(`/chat${params.toString() ? `?${params.toString()}` : ''}`)
    setIsSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 py-16 md:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-center text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl leading-[1.15]">
          Your AI assistant that{' '}
          <span className="text-primary">does things</span>
        </h1>

        <p className="mt-4 max-w-lg text-center text-base leading-relaxed text-muted-foreground">
          Ask it to do something — search the web, send emails, look things up. It performs the task and reports back.
        </p>

        {/* Main Input Area */}
        <div className="mt-10 w-full">
          <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/30">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to do something… e.g. Search for X, send an email, look up Y"
              rows={3}
              className="w-full resize-none rounded-2xl bg-transparent px-5 pt-5 pb-14 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground/50">
                {'Gemini 3 Flash'}
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isSubmitting}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-30 hover:opacity-90"
                aria-label="Go to assistant"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => setInput(s.prompt)}
              disabled={isSubmitting}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground hover:bg-accent disabled:opacity-50"
            >
              <s.icon className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
