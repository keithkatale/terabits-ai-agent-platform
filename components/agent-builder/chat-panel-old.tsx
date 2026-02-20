'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Markdown } from '@/components/prompt-kit/markdown'
import { ThinkingBar } from '@/components/prompt-kit/thinking-bar'
import { ToolCall } from '@/components/prompt-kit/tool-call'
import { FeedbackBar } from '@/components/prompt-kit/feedback-bar'
import { PlanArtifact } from '@/components/agent-builder/plan-artifact'
import type { Agent, AgentSkill } from '@/lib/types'
import type { AgentPlanArtifact } from '@/lib/types/artifact'
import type { Node, Edge } from '@xyflow/react'

// Tool name to friendly label mapping
const TOOL_LABELS: Record<string, string> = {
  present_plan: 'Presenting plan for review',
  updateAgent: 'Updating agent configuration',
  addWorkflowNodes: 'Building workflow nodes',
  addWorkflowEdges: 'Connecting workflow edges',
  addSkill: 'Adding skill capability',
  saveSystemPrompt: 'Saving system prompt',
  checkPlatformCapabilities: 'Checking platform capabilities',
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    name: string
    args: any
    result?: any
    success?: boolean
  }>
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
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialPromptSent = useRef(false)
  const [currentPlan, setCurrentPlan] = useState<AgentPlanArtifact | null>(null)
  const [isApprovingPlan, setIsApprovingPlan] = useState(false)

  // Load existing messages for this agent
  useEffect(() => {
    const loadMessages = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('message_type', 'builder')
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          toolCalls: msg.metadata?.toolCalls,
        }))
        setMessages(loadedMessages)
      }
    }
    loadMessages()
  }, [agent.id])

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsThinking(true)
    setCurrentPlan(null)

    // Save user message to database
    const supabase = createClient()
    await supabase.from('messages').insert({
      agent_id: agent.id,
      role: 'user',
      content: text,
      message_type: 'builder',
      metadata: {},
    })

    try {
      const response = await fetch('/api/agent-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          agentId: agent.id,
          agentPhase: agent.conversation_phase,
          agentName: agent.name,
          agentCategory: agent.category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        toolCalls: [],
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2))

                if (typeof content === 'string') {
                  // Handle thinking markers
                  if (content.includes('__THOUGHT__')) {
                    setIsThinking(true)
                    continue
                  }
                  if (content.includes('__END_THOUGHT__')) {
                    setIsThinking(false)
                    continue
                  }

                  // Handle tool call markers
                  if (content.includes('__TOOL_CALL__')) {
                    const match = /__TOOL_CALL__(.+?)__ARGS__(.+?)__END_TOOL_CALL__/.exec(content)
                    if (match) {
                      const toolName = match[1]
                      const toolArgs = JSON.parse(match[2])
                      
                      assistantMessage.toolCalls = assistantMessage.toolCalls || []
                      assistantMessage.toolCalls.push({
                        name: toolName,
                        args: toolArgs,
                      })
                      
                      setMessages((prev) => {
                        const updated = [...prev]
                        updated[updated.length - 1] = { ...assistantMessage }
                        return updated
                      })
                    }
                    continue
                  }

                  // Handle tool result markers
                  if (content.includes('__TOOL_RESULT__')) {
                    const match = /__TOOL_RESULT__(.+?)__SUCCESS__(.+?)__DATA__(.+?)__END_TOOL_RESULT__/.exec(content)
                    if (match) {
                      const toolName = match[1]
                      const success = match[2] === 'true'
                      const data = match[3]
                      
                      if (assistantMessage.toolCalls) {
                        const toolCall = assistantMessage.toolCalls.find((tc) => tc.name === toolName && !tc.result)
                        if (toolCall) {
                          toolCall.result = data
                          toolCall.success = success
                          
                          setMessages((prev) => {
                            const updated = [...prev]
                            updated[updated.length - 1] = { ...assistantMessage }
                            return updated
                          })
                        }
                      }
                    }
                    continue
                  }

                  // Regular text content
                  assistantMessage.content += content
                  setMessages((prev) => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { ...assistantMessage }
                    return updated
                  })
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Extract plan artifact if present
      const planMatch = assistantMessage.content.match(/\[PLAN_ARTIFACT\]([\s\S]*?)\[\/PLAN_ARTIFACT\]/)
      if (planMatch) {
        try {
          const planData = JSON.parse(planMatch[1])
          console.log('Plan artifact detected:', planData)
          setCurrentPlan(planData)
          // Remove artifact marker from displayed content
          assistantMessage.content = assistantMessage.content.replace(/\[PLAN_ARTIFACT\][\s\S]*?\[\/PLAN_ARTIFACT\]/, '').trim()
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...assistantMessage }
            return updated
          })
        } catch (error) {
          console.error('Failed to parse plan artifact:', error)
          console.error('Plan artifact content:', planMatch[1])
        }
      } else {
        console.log('No plan artifact found in message:', assistantMessage.content.substring(0, 200))
      }

      // Save assistant message to database
      await supabase.from('messages').insert({
        agent_id: agent.id,
        role: 'assistant',
        content: assistantMessage.content,
        message_type: 'builder',
        metadata: { toolCalls: assistantMessage.toolCalls },
      })

      await refreshWorkflow()
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ An error occurred. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
      setIsThinking(false)
    }
  }

  // Auto-send initial prompt from landing page
  useEffect(() => {
    if (initialPromptSent.current) return
    const storedPrompt = sessionStorage.getItem('terabits_initial_prompt')
    if (storedPrompt && messages.length === 0 && !isLoading) {
      initialPromptSent.current = true
      sessionStorage.removeItem('terabits_initial_prompt')
      sendMessage(storedPrompt)
    }
  }, [messages.length, isLoading])

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
    sendMessage(input)
  }

  const handlePlanApprove = async () => {
    if (!currentPlan) return
    setIsApprovingPlan(true)
    await sendMessage('I approve this plan. Please start building.')
    setCurrentPlan(null)
    setIsApprovingPlan(false)
  }

  const handlePlanReject = async (feedback?: string) => {
    if (!currentPlan) return
    const message = feedback 
      ? `I'd like to make some changes: ${feedback}`
      : 'I\'d like to make some changes to this plan.'
    await sendMessage(message)
    setCurrentPlan(null)
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
                      onClick={() => sendMessage(suggestion)}
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
            <div className="space-y-5">
              {messages.map((message, messageIndex) => {
                const hasContent = message.content || (message.toolCalls && message.toolCalls.length > 0)
                if (!hasContent) return null

                // User message
                if (message.role === 'user') {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  )
                }

                // Assistant message
                const isLastAssistant = messageIndex === messages.length - 1 && message.role === 'assistant'
                // Show plan if this is the last message and we have a current plan
                const shouldShowPlan = isLastAssistant && currentPlan !== null

                return (
                  <div key={message.id} className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">T</span>
                    </div>

                    {/* Message content */}
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {/* Tool invocations */}
                      {message.toolCalls?.map((toolCall, i) => {
                        // Skip rendering present_plan tool calls (shown as artifact instead)
                        if (toolCall.name === 'present_plan') return null

                        const toolState = toolCall.result !== undefined ? 'completed'
                          : 'running'

                        return (
                          <ToolCall
                            key={`${message.id}-tool-${i}`}
                            name={TOOL_LABELS[toolCall.name] ?? toolCall.name}
                            state={toolState as 'pending' | 'running' | 'completed' | 'error'}
                            input={toolCall.args}
                            output={toolCall.result ? { result: toolCall.result } : undefined}
                            defaultOpen={false}
                          />
                        )
                      })}

                      {/* Plan artifact (if present and is last message) */}
                      {shouldShowPlan && (
                        <PlanArtifact
                          plan={currentPlan}
                          onApprove={handlePlanApprove}
                          onReject={handlePlanReject}
                          isProcessing={isApprovingPlan}
                        />
                      )}

                      {/* Text content with Markdown rendering */}
                      {message.content && (
                        <Markdown id={message.id}>{message.content}</Markdown>
                      )}

                      {/* Feedback bar -- shown for completed non-streaming assistant messages */}
                      {!isLoading && message.content && !shouldShowPlan && (
                        <FeedbackBar messageContent={message.content} />
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-[10px] font-bold text-primary">T</span>
                  </div>
                  <div className="flex-1">
                    <ThinkingBar text="Terabits is thinking" />
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
