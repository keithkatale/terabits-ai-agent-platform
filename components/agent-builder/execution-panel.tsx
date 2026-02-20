'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react'
import type { Agent } from '@/lib/types'

interface ExecutionPanelProps {
  agent: Agent
}

interface ExecutionResult {
  executionId: string
  status: 'completed' | 'error'
  output?: Record<string, unknown>
  error?: string
  executionTimeMs: number
}

export function ExecutionPanel({ agent }: ExecutionPanelProps) {
  const [input, setInput] = useState<Record<string, string>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const handleExecute = async () => {
    setIsExecuting(true)
    setResult(null)
    setLogs([])

    try {
      const response = await fetch(`/api/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
      setLogs((prev) => [...prev, 'Execution completed successfully'])
    } catch (error) {
      setResult({
        executionId: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: 0,
      })
      setLogs((prev) => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="flex h-full flex-col space-y-4 p-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Execute Agent</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Provide input and run your agent
        </p>
      </div>

      {/* Input Section */}
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="input-message" className="text-xs">
              Message / Instructions
            </Label>
            <Input
              id="input-message"
              placeholder="What do you want the agent to do?"
              value={input.message || ''}
              onChange={(e) => setInput({ ...input, message: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="input-data" className="text-xs">
              Additional Data (optional)
            </Label>
            <Input
              id="input-data"
              placeholder='{"key": "value"}'
              value={input.data || ''}
              onChange={(e) => setInput({ ...input, data: e.target.value })}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleExecute}
            disabled={isExecuting || !input.message}
            className="w-full"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute Agent
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Logs Section */}
      {logs.length > 0 && (
        <Card className="p-4">
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">
            Execution Logs
          </h4>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-xs text-foreground">
                {log}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Result Section */}
      {result && (
        <Card className="p-4">
          <div className="flex items-start gap-2">
            {result.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground">
                {result.status === 'completed' ? 'Success' : 'Error'}
              </h4>
              {result.error && (
                <p className="mt-1 text-xs text-red-600">{result.error}</p>
              )}
              {result.output && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Output:</p>
                  <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(result.output, null, 2)}
                  </pre>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Execution time: {result.executionTimeMs}ms
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
