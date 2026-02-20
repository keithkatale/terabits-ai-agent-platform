// Translates Terabits visual workflows into OpenClaw configuration

import type { Agent, WorkflowNode, WorkflowEdge } from '@/lib/types'
import type { OpenClawConfig } from './types'
import { generateSkillsFromWorkflow } from './skill-generator'
import { generateSystemPrompt } from './system-prompt-generator'
import { resolveToolAllowlist } from './tool-resolver'

export interface WorkflowTranslationInput {
  agent: Agent
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/**
 * Translates a Terabits workflow into OpenClaw configuration
 * This is the main entry point for workflow → OpenClaw conversion
 */
export async function translateWorkflowToOpenClaw(
  input: WorkflowTranslationInput
): Promise<OpenClawConfig> {
  const { agent, nodes, edges } = input

  // Generate skills from action nodes
  const skills = await generateSkillsFromWorkflow(nodes, edges)

  // Generate system prompt from workflow
  const systemPrompt = generateSystemPrompt(agent, nodes, edges)

  // Resolve tool allowlist based on node types
  const toolAllowlist = resolveToolAllowlist(nodes)

  // Determine workspace directory
  const workspaceDir = resolveWorkspaceDir(agent.id)

  // Determine session key
  const sessionKey = `terabits:agent:${agent.id}:runtime`

  return {
    systemPrompt,
    skills,
    toolAllowlist,
    workspaceDir,
    model: agent.model || 'anthropic/claude-opus-4-6',
    sessionKey,
    agentId: agent.id,
  }
}

/**
 * Resolves the workspace directory for an agent
 * Each agent gets its own isolated workspace
 */
function resolveWorkspaceDir(agentId: string): string {
  // Use home directory for workspace
  // OpenClaw will create this if it doesn't exist
  return `~/.terabits/agents/${agentId}/workspace`
}

/**
 * Validates that a workflow can be executed by OpenClaw
 */
export function validateWorkflowForExecution(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Must have at least one trigger node
  const triggerNodes = nodes.filter((n) => n.node_type === 'trigger')
  if (triggerNodes.length === 0) {
    errors.push('Workflow must have at least one trigger node')
  }

  // Must have at least one output node
  const outputNodes = nodes.filter((n) => n.node_type === 'output')
  if (outputNodes.length === 0) {
    errors.push('Workflow must have at least one output node')
  }

  // All nodes must be connected
  const connectedNodeIds = new Set<string>()
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source_node_id)
    connectedNodeIds.add(edge.target_node_id)
  })

  const disconnectedNodes = nodes.filter(
    (node) => !connectedNodeIds.has(node.node_id) && nodes.length > 1
  )
  if (disconnectedNodes.length > 0) {
    errors.push(
      `Disconnected nodes: ${disconnectedNodes.map((n) => n.label).join(', ')}`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
