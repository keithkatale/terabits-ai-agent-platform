// Core types for OpenClaw-inspired agent runtime

export interface AgentTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
  metadata?: {
    category?: 'runtime' | 'filesystem' | 'web' | 'memory' | 'session' | 'messaging' | 'canvas'
    ownerOnly?: boolean
    requiresApproval?: boolean
  }
}

export interface AgentRunConfig {
  agentId: string
  sessionId: string
  sessionKey: string
  message: string
  systemPrompt: string
  model: string
  tools: AgentTool[]
  memory?: AgentMemory
  maxTokens?: number
  temperature?: number
  maxToolCalls?: number
  timeoutSeconds?: number
  userId: string
}

export interface AgentMemory {
  longTerm: MemoryEntry[]
  dailyLogs: MemoryEntry[]
  facts: MemoryEntry[]
}

export interface MemoryEntry {
  id: string
  content: string
  summary?: string
  importance: number
  tags: string[]
  createdAt: string
  accessCount: number
}

export interface SessionMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  tokensUsed?: number
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  id: string
  name: string
  output: unknown
  error?: string
  executionTimeMs?: number
}

export interface AgentRunResult {
  runId: string
  status: 'completed' | 'error' | 'timeout'
  message?: string
  error?: string
  tokensUsed: number
  executionTimeMs: number
  toolCallsCount: number
}

export interface ToolPolicy {
  profile?: 'minimal' | 'coding' | 'messaging' | 'full'
  allowedTools?: string[]
  deniedTools?: string[]
  ownerOnlyTools?: string[]
  maxToolCallsPerTurn?: number
}

export interface LaneQueueItem {
  runId: string
  sessionId: string
  priority: number
  task: () => Promise<AgentRunResult>
  queuedAt: Date
}

export interface StreamEvent {
  type: 'lifecycle' | 'assistant' | 'tool' | 'error'
  phase?: 'start' | 'end' | 'error'
  content?: string
  toolName?: string
  toolState?: 'pending' | 'running' | 'completed' | 'error'
  toolInput?: Record<string, unknown>
  toolOutput?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

export interface CompactionConfig {
  enabled: boolean
  triggerTokenThreshold: number
  targetTokenCount: number
  reserveTokens: number
  keepRecentMessages: number
}

export interface SubAgentSpawnConfig {
  task: string
  label?: string
  parentSessionId: string
  agentId?: string
  timeoutSeconds?: number
  cleanup?: 'delete' | 'keep'
}

export interface SubAgentSpawnResult {
  status: 'accepted' | 'error'
  runId: string
  childSessionKey: string
  error?: string
}

// Tool categories for policy filtering
export const TOOL_CATEGORIES = {
  runtime: ['exec', 'bash', 'process'],
  filesystem: ['read', 'write', 'edit', 'apply_patch'],
  web: ['web_search', 'web_fetch'],
  memory: ['memory_search', 'memory_get', 'memory_store', 'memory_update'],
  session: ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn'],
  messaging: ['message', 'send_email', 'send_notification'],
  canvas: ['update_workflow', 'add_node', 'remove_node', 'connect_nodes'],
} as const

// Tool profiles (like OpenClaw)
export const TOOL_PROFILES: Record<string, string[]> = {
  minimal: ['read', 'web_search', 'web_fetch', 'memory_search', 'memory_get'],
  coding: [
    'read', 'write', 'edit', 'exec', 'bash',
    'web_search', 'web_fetch',
    'memory_search', 'memory_get', 'memory_store'
  ],
  messaging: [
    'read', 'message', 'send_email', 'send_notification',
    'web_search', 'web_fetch',
    'memory_search', 'memory_get'
  ],
  full: ['*'], // All tools
}
