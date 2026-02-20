// Tool Registry: Central registry for all agent tools

import type { AgentTool } from '../types'
import { filesystemTools } from './filesystem-tools'
import { webTools } from './web-tools'
import { createMemoryTools } from './memory-tools'
import { createSessionTools } from './session-tools'
import { createCanvasTools } from './canvas-tools'

/**
 * Load all tools for an agent
 */
export async function loadAgentTools(
  agentId: string,
  options: {
    includeFilesystem?: boolean
    includeWeb?: boolean
    includeMemory?: boolean
    includeSessions?: boolean
    includeCanvas?: boolean
  } = {}
): Promise<AgentTool[]> {
  const {
    includeFilesystem = true,
    includeWeb = true,
    includeMemory = true,
    includeSessions = true,
    includeCanvas = true,
  } = options

  const tools: AgentTool[] = []

  // Filesystem tools
  if (includeFilesystem) {
    tools.push(...filesystemTools)
  }

  // Web tools
  if (includeWeb) {
    tools.push(...webTools)
  }

  // Memory tools (agent-specific)
  if (includeMemory) {
    tools.push(...createMemoryTools(agentId))
  }

  // Session tools (agent-specific)
  if (includeSessions) {
    tools.push(...createSessionTools(agentId))
  }

  // Canvas tools (agent-specific)
  if (includeCanvas) {
    tools.push(...createCanvasTools(agentId))
  }

  return tools
}

/**
 * Get tool by name
 */
export async function getToolByName(
  agentId: string,
  toolName: string
): Promise<AgentTool | null> {
  const tools = await loadAgentTools(agentId)
  return tools.find((t) => t.name === toolName) ?? null
}

/**
 * Get tools by category
 */
export async function getToolsByCategory(
  agentId: string,
  category: string
): Promise<AgentTool[]> {
  const tools = await loadAgentTools(agentId)
  return tools.filter((t) => t.metadata?.category === category)
}

/**
 * List all available tool names
 */
export async function listToolNames(agentId: string): Promise<string[]> {
  const tools = await loadAgentTools(agentId)
  return tools.map((t) => t.name)
}

/**
 * Get tool metadata
 */
export async function getToolMetadata(agentId: string): Promise<
  Array<{
    name: string
    description: string
    category?: string
    ownerOnly?: boolean
    requiresApproval?: boolean
  }>
> {
  const tools = await loadAgentTools(agentId)
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    category: t.metadata?.category,
    ownerOnly: t.metadata?.ownerOnly,
    requiresApproval: t.metadata?.requiresApproval,
  }))
}

// Re-export tool creation functions
export { createMemoryTools } from './memory-tools'
export { createSessionTools } from './session-tools'
export { createCanvasTools } from './canvas-tools'
export { filesystemTools } from './filesystem-tools'
export { webTools } from './web-tools'
