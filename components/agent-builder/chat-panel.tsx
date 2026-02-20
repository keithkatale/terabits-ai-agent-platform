'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
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
  addCanvasNode: 'Adding workflow node',
  addCanvasEdge: 'Connecting workflow nodes',
  updateCanvasNode: 'Updating node configuration',
  inspectCanvas: 'Verifying workflow structure',
  generateInstructions: 'Generating execution instructions',
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
  onAddNode: (node: Node) => void
  onAddEdge: (edge: Edge) => void
  onUpdateNode: (id: string, updates: Record<string, unknown>) => void
  isFullWidth: boolean
}

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
  
  if (typeof p.type === 'string' && p.type.startsWith('tool-') && p.type !== 'tool-invocation') {
    return {
      toolName: p.type.replace('tool-', ''),
      toolCallId: String(p.toolCallId ?? ''),
      state: String(p.state ?? 'unknown'),
      input: p.input,
      output: p.output,
    }
  }
  
  return null
}

function isToolPart(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false
  const p = part as Record<string, unknown>
  return p.type === 'tool-invocation' || (typeof p.type === 'string' && p.type.startsWith('tool-'))
}

export function ChatPanel({ agent, onWorkflowUpdate, onAddNode, onAddEdge, onUpdateNode, isFullWidth }: ChatPanelProps) {
  const [currentPlan, setCurrentPlan] = useState<AgentPlanArtifact | null>(null)
  const [isApprovingPlan, setIsApprovingPlan] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
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
            agentPhase: agent.conversation_phase,
            agentName: agent.name,
            agentCategory: agent.category,
          },
        }),
      }),
    [agent.id, agent.conversation_phase, agent.name, agent.category]
  )

  const { messages, sendMessage, status, setMessages } = useChat({ transport })

  // Load existing messages on mount
  useEffect(() => {
    if (messagesLoadedRef.current) return
    
    const loadMessages = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('message_type', 'builder')
        .order('created_at', { ascending: true })
        .limit(50)

      if (data && data.length > 0) {
        // Convert to AI SDK UIMessage format
        const uiMessages: UIMessage[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          parts: [
            {
              type: 'text' as const,
              text: msg.content,
            },
          ],
        }))
        setMessages(uiMessages)
        messagesLoadedRef.current = true
      }
    }
    
    if (messages.length === 0 && status === 'ready') {
      loadMessages()
    }
  }, [agent.id, messages.length, status, setMessages])

  // Save assistant messages to database
  useEffect(() => {
    const saveAssistantMessages = async () => {
      const supabase = createClient()
      
      // Find assistant messages that haven't been saved yet
      for (const message of messages) {
        if (message.role !== 'assistant') continue
        
        // Extract text content from parts
        const parts = message.parts ?? []
        const textContent = parts
          .filter((p): p is { type: 'text'; text: string } => (p as Record<string, unknown>).type === 'text')
          .map((p) => p.text)
          .join('')
        
        if (!textContent) continue
        
        // Check if this message is already in the database
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('agent_id', agent.id)
          .eq('role', 'assistant')
          .eq('content', textContent)
          .eq('message_type', 'builder')
          .single()
        
        // If not in database, save it
        if (!existing) {
          await supabase.from('messages').insert({
            agent_id: agent.id,
            role: 'assistant',
            content: textContent,
            message_type: 'builder',
            metadata: {},
          })
        }
      }
    }
    
    // Only save when status is ready (message complete)
    if (status === 'ready' && messages.length > 0) {
      saveAssistantMessages()
    }
  }, [messages, status, agent.id])

  // Process tool outputs to update canvas
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

        const action = out.__canvasAction as string | undefined

        // Handle canvas actions (like industry platform)
        if (action === 'addNode' || inv.toolName === 'addCanvasNode') {
          const pos = out.position as Record<string, unknown> | undefined
          onAddNode({
            id: String(out.id ?? `auto-${Date.now()}`),
            type: 'agentNode',
            position: { x: Number(pos?.x ?? 0), y: Number(pos?.y ?? 0) },
            data: (out.data as Record<string, unknown>) ?? {},
          })
        }
        if (action === 'addEdge' || inv.toolName === 'addCanvasEdge') {
          onAddEdge({
            id: String(out.id ?? `edge-${out.source}-${out.target}`),
            source: String(out.source),
            target: String(out.target),
            ...(out.label ? { label: String(out.label) } : {}),
            animated: true,
          })
        }
        if (action === 'updateNode' || inv.toolName === 'updateCanvasNode') {
          onUpdateNode(String(out.id), (out.updates as Record<string, unknown>) ?? {})
        }
        
        // Handle plan artifact
        if (out.__artifactAction === 'presentPlan' && out.artifact) {
          setCurrentPlan(out.artifact as AgentPlanArtifact)
        }
      }
    }
  }, [messages, onWorkflowUpdate, onAddNode, onAddEdge, onUpdateNode])

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
  }, [inputValue])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || status !== 'ready') return
    
    const messageContent = inputValue
    setInputValue('') // Clear input immediately
    
    // Save user message to database
    const supabase = createClient()
    await supabase.from('messages').insert({
      agent_id: agent.id,
      role: 'user',
      content: messageContent,
      message_type: 'builder',
      metadata: {},
    })
    
    // Send message using AI SDK
    sendMessage({ text: messageContent })
    
    // Refresh workflow after sending
    setTimeout(() => refreshWorkflow(), 1000)
  }

  const handlePlanApprove = async () => {
    if (!currentPlan) return
    setIsApprovingPlan(true)
    setCurrentPlan(null)
    
    // Save user message to database
    const supabase = createClient()
    await supabase.from('messages').insert({
      agent_id: agent.id,
      role: 'user',
      content: 'I approve this plan. Please start building.',
      message_type: 'builder',
      metadata: {},
    })
    
    sendMessage({ text: 'I approve this plan. Please start building.' })
    setIsApprovingPlan(false)
  }

  const handlePlanReject = async (feedback?: string) => {
    if (!currentPlan) return
    const message = feedback 
      ? `I'd like to make some changes: ${feedback}`
      : 'I\'d like to make some changes to this plan.'
    
    setCurrentPlan(null)
    
    // Save user message to database
    const supabase = createClient()
    await supabase.from('messages').insert({
      agent_id: agent.id,
      role: 'user',
      content: message,
      message_type: 'builder',
      metadata: {},
    })
    
    sendMessage({ text: message })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFormSubmit(e as any)
    }
  }

  const containerClass = isFullWidth
    ? 'mx-auto w-full max-w-2xl px-4 lg:px-0'
    : 'w-full px-4'

  const isWorking = status === 'submitted' || status === 'streaming'

  return (
    <div className="relative flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-36">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className={containerClass}>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground text-balance">
                    What role do you need filled?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Describe the AI employee you want to hire. I'll ask questions to understand exactly what you need, then build it for you.
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
                      onClick={() => {
                        setInputValue(suggestion)
                        const form = document.querySelector('form')
                        if (form) form.requestSubmit()
                      }}
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
              {messages.map((message: UIMessage, messageIndex: number) => {
                // User message
                if (message.role === 'user') {
                  const parts = message.parts ?? []
                  const textContent = parts
                    .filter((p): p is { type: 'text'; text: string } => (p as Record<string, unknown>).type === 'text')
                    .map((p) => p.text)
                    .join('')
                  
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{textContent}</p>
                      </div>
                    </div>
                  )
                }

                // Assistant message
                const isLastAssistant = messageIndex === messages.length - 1 && message.role === 'assistant'
                const shouldShowPlan = isLastAssistant && currentPlan !== null
                const parts = message.parts ?? []
                const toolInvocations = parts.filter(isToolPart)

                return (
                  <div key={message.id} className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">T</span>
                    </div>

                    {/* Message content */}
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {/* Tool invocations */}
                      {toolInvocations.map((part: unknown, i: number) => {
                        const inv = getToolInvocation(part)
                        if (!inv) return null
                        
                        // Skip rendering present_plan tool calls (shown as artifact instead)
                        if (inv.toolName === 'present_plan') return null

                        const toolState = inv.state === 'output-available' ? 'completed'
                          : inv.state === 'input-streaming' || inv.state === 'input-available' ? 'running'
                          : inv.state === 'output-error' ? 'error'
                          : 'pending'

                        return (
                          <ToolCall
                            key={`${message.id}-tool-${i}`}
                            name={TOOL_LABELS[inv.toolName] ?? inv.toolName}
                            state={toolState as 'pending' | 'running' | 'completed' | 'error'}
                            input={inv.input as Record<string, unknown> | undefined}
                            output={inv.output ? { result: inv.output } : undefined}
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
                      {parts.map((part, pi) => {
                        const pp = part as Record<string, unknown>
                        if (pp.type === 'text' && pp.text) {
                          return <Markdown key={pi} id={`${message.id}-${pi}`}>{String(pp.text)}</Markdown>
                        }
                        return null
                      })}

                      {/* Feedback bar */}
                      {!isWorking && parts.some((p) => (p as Record<string, unknown>).type === 'text') && !shouldShowPlan && (
                        <FeedbackBar messageContent={
                          String((parts.find((p) => (p as Record<string, unknown>).type === 'text') as Record<string, unknown> | undefined)?.text || '')
                        } />
                      )}
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
          <form onSubmit={handleFormSubmit}>
            <div className="relative rounded-2xl border border-border bg-card shadow-lg backdrop-blur-sm transition-all focus-within:shadow-xl focus-within:border-primary/30">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what your AI employee should do..."
                disabled={status !== 'ready'}
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
