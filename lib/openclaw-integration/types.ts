// Type definitions for OpenClaw integration

import type { Agent, WorkflowNode, WorkflowEdge } from '@/lib/types'

export interface OpenClawConfig {
  systemPrompt: string
  skills: SkillDefinition[]
  toolAllowlist: string[]
  workspaceDir: string
  model: string
  sessionKey: string
  agentId: string
}

export interface SkillDefinition {
  name: string
  description: string
  content: string
  tools: string[]
  metadata?: Record<string, unknown>
}

export interface ExecutionInput {
  agentId: string
  sessionId: string
  userInput: string | Record<string, unknown>
  workflow: {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
  }
  agent: Agent
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
}

export interface ExecutionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  toolCalls?: Array<{
    tool: string
    input: unknown
    output: unknown
  }>
  usage?: {
    input: number
    output: number
    total: number
  }
  executionTimeMs: number
  error?: string
}

export interface NodeSkillMapping {
  nodeType: string
  skillName: string
  toolsRequired: string[]
  templateGenerator: (node: WorkflowNode) => string
}
