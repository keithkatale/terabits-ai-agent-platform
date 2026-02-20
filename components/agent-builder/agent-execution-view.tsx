'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles, Play, Square } from 'lucide-react'
import type { Agent } from '@/lib/types'

interface AgentExecutionViewProps {
  agent: Agent
  isRunning: boolean
  onStop: () => void
  triggerConfig?: {
    inputFields?: Array<{
      name: string
      label: string
      type: 'text' | 'number' | 'url' | 'textarea'
      placeholder?: string
      required?: boolean
    }>
    buttonLabel?: string
  }
}

interface ExecutionStep {
  id: string
  type: 'thinking' | 'action' | 'result' | 'error'
  message: string
  timestamp: Date
  details?: string
}

export function AgentExecutionView({ agent, isRunning, onStop, triggerConfig }: AgentExecutionViewProps) {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [steps])

  const handleExecute = async () => {
    // Validate required fields
    const hasRequiredFields = triggerConfig?.inputFields?.every(field => 
      !field.required || inputValues[field.name]?.trim()
    ) ?? true

    if (!hasRequiredFields) return

    // Build input object from configured fields
    const input = triggerConfig?.inputFields
      ? Object.fromEntries(
          triggerConfig.inputFields.map(field => [field.name, inputValues[field.name] || ''])
        )
      : { task: inputValues['default'] || '' }

    // Add user input step
    const userStep: ExecutionStep = {
      id: Date.now().toString(),
      type: 'action',
      message: `Starting: ${JSON.stringify(input)}`,
      timestamp: new Date(),
    }
    setSteps((prev) => [...prev, userStep])

    try {
      const response = await fetch(`/api/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input,
          stream: true 
        }),
      })

      if (!response.ok) throw new Error('Execution failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                // Map execution events to user-friendly messages
                let message = data.message || ''
                let type: ExecutionStep['type'] = 'thinking'
                
                if (data.type === 'tool_call') {
                  type = 'action'
                  message = `Using tool: ${data.toolName || 'processing'}`
                } else if (data.type === 'tool_result') {
                  type = 'result'
                  message = `Completed: ${data.toolName || 'task'}`
                } else if (data.type === 'thinking') {
                  type = 'thinking'
                  message = data.message || 'Thinking...'
                } else if (data.type === 'complete') {
                  type = 'result'
                  message = 'Task completed successfully!'
                } else if (data.type === 'error') {
                  type = 'error'
                  message = data.error || 'An error occurred'
                }
                
                const step: ExecutionStep = {
                  id: Date.now().toString() + Math.random(),
                  type,
                  message,
                  timestamp: new Date(),
                  details: data.details,
                }
                setSteps((prev) => [...prev, step])
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }
      }

      setInputValues({})
    } catch (error) {
      const errorStep: ExecutionStep = {
        id: Date.now().toString(),
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong',
        timestamp: new Date(),
      }
      setSteps((prev) => [...prev, errorStep])
    }
  }

  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'thinking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'action':
        return <Play className="h-4 w-4 text-amber-500" />
      case 'result':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Agent Execution</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Watch your agent work in real-time
            </p>
          </div>
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={onStop}>
              <Square className="mr-2 h-4 w-4" />
              Stop Agent
            </Button>
          )}
        </div>
      </div>

      {/* Execution Steps */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        {steps.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h4 className="mt-4 text-lg font-medium text-foreground">Ready to work</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Give your agent a task to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step) => (
              <Card key={step.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStepIcon(step.type)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{step.message}</p>
                    {step.details && (
                      <p className="mt-1 text-xs text-muted-foreground">{step.details}</p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {step.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-6">
        {triggerConfig?.inputFields && triggerConfig.inputFields.length > 0 ? (
          <div className="space-y-4">
            {triggerConfig.inputFields.map((field) => (
              <div key={field.name}>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={inputValues[field.name] || ''}
                    onChange={(e) => setInputValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={inputValues[field.name] || ''}
                    onChange={(e) => setInputValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            ))}
            <Button 
              onClick={handleExecute} 
              disabled={!triggerConfig.inputFields.every(f => !f.required || inputValues[f.name]?.trim())}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              {triggerConfig.buttonLabel || 'Execute'}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValues['default'] || ''}
              onChange={(e) => setInputValues({ default: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
              placeholder="Tell your agent what to do..."
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={handleExecute} disabled={!inputValues['default']?.trim()}>
              <Play className="mr-2 h-4 w-4" />
              Execute
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {triggerConfig?.inputFields 
            ? 'Fill in the fields above to run your agent'
            : 'Example: "Find 10 leads on Reddit about AI tools"'}
        </p>
      </div>
    </div>
  )
}
