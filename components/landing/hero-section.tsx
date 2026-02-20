'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Briefcase, MessageSquare, BarChart3, Clock, Search, Sparkles } from 'lucide-react'

const suggestions = [
  {
    icon: Briefcase,
    label: 'Customer Support',
    prompt: 'I need an AI employee to handle customer support emails and live chat',
  },
  {
    icon: MessageSquare,
    label: 'Content Creator',
    prompt: 'I want an AI that writes blog posts and social media content weekly',
  },
  {
    icon: BarChart3,
    label: 'Data Analyst',
    prompt: 'I need someone to analyze our sales data and generate weekly reports',
  },
  {
    icon: Clock,
    label: 'Task Automator',
    prompt: 'I want to automate our invoice processing and follow-up workflows',
  },
  {
    icon: Search,
    label: 'Researcher',
    prompt: 'I need an AI to research market trends and compile competitor analysis',
  },
]

export function HeroSection() {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(promptText?: string) {
    const text = promptText || input
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)

    // Store the initial prompt in sessionStorage so the agent builder can pick it up
    sessionStorage.setItem('terabits_initial_prompt', text.trim())
    router.push('/agent/new')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 py-16 md:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">AI Employees</span>
        </div>

        {/* Headline */}
        <h1 className="text-balance text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl">
          Hire your next
          <span className="text-primary">{' AI employee'}</span>
        </h1>

        <p className="mt-4 max-w-lg text-center text-base leading-relaxed text-muted-foreground">
          Describe the role you need filled. No code, no APIs, no setup required.
        </p>

        {/* Main Input Area */}
        <div className="mt-10 w-full">
          <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/30">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want your AI employee to do..."
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
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30 hover:opacity-90"
                aria-label="Start building"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setInput(s.prompt)
                handleSubmit(s.prompt)
              }}
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
