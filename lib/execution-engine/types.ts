// Type definitions for the instruction-based execution engine

export interface AgentExecutionInput {
  agentId: string
  userId: string
  input: Record<string, unknown>
  sessionId?: string
}

export interface AgentExecutionConfig {
  instructionPrompt: string
  toolConfig: Record<string, ToolConfig>
  executionContext: Record<string, unknown>
  mcpServers: MCPServerConfig[]
  model: string
}

export interface ToolConfig {
  enabled: boolean
  config?: Record<string, unknown>
}

export interface MCPServerConfig {
  name: string
  config: Record<string, unknown>
  enabled: boolean
}

export interface ExecutionEvent {
  type: 'lifecycle' | 'assistant' | 'tool' | 'error'
  phase?: 'start' | 'end'
  delta?: string
  tool?: string
  status?: 'pending' | 'running' | 'completed' | 'error'
  input?: unknown
  output?: unknown
  error?: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface ExecutionResult {
  executionId: string
  sessionId: string
  status: 'completed' | 'error' | 'cancelled'
  output?: Record<string, unknown>
  toolCalls: ToolCall[]
  tokensUsed: number
  executionTimeMs: number
  error?: string
}

export interface ToolCall {
  tool: string
  input: unknown
  output: unknown
  status: 'completed' | 'error'
  error?: string
  timestamp: Date
}

export interface Tool {
  name: string
  description: string
  execute: (input: unknown, context: ExecutionContext) => Promise<unknown>
  schema?: Record<string, unknown>
}

export interface ExecutionContext {
  agentId: string
  userId: string
  sessionId: string
  executionId: string
  variables: Record<string, unknown>
}

export interface StreamCallback {
  (event: ExecutionEvent): void
}
