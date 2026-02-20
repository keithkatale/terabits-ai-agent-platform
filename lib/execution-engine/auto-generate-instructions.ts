// Auto-generate instruction prompts when agents are saved
// This ensures every agent has executable instructions

import { createClient } from '@/lib/supabase/server'
import {
  generateInstructionPrompt,
  generateDefaultInstructionPrompt,
  extractToolConfig,
  extractExecutionContext,
} from './workflow-to-instructions'

/**
 * Auto-generate and save instruction prompt for an agent
 * Call this after workflow is saved or agent is updated
 */
export async function autoGenerateInstructions(agentId: string): Promise<void> {
  const supabase = await createClient()

  // Load agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  // Load workflow nodes and edges
  const { data: nodes } = await supabase
    .from('workflow_nodes')
    .select('*')
    .eq('agent_id', agentId)

  const { data: edges } = await supabase
    .from('workflow_edges')
    .select('*')
    .eq('agent_id', agentId)

  // Generate instruction prompt
  let instructionPrompt: string
  if (nodes && nodes.length > 0) {
    instructionPrompt = generateInstructionPrompt(agent, nodes, edges || [])
  } else {
    instructionPrompt = generateDefaultInstructionPrompt(agent)
  }

  // Extract tool config
  const toolConfig = nodes && nodes.length > 0 
    ? extractToolConfig(nodes)
    : { write: { enabled: true } }

  // Extract execution context
  const executionContext = nodes && nodes.length > 0
    ? extractExecutionContext(agent, nodes)
    : {}

  // Update agent
  const { error: updateError } = await supabase
    .from('agents')
    .update({
      instruction_prompt: instructionPrompt,
      tool_config: toolConfig,
      execution_context: executionContext,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  if (updateError) {
    throw new Error(`Failed to update agent: ${updateError.message}`)
  }

  // Create/update tool records
  await syncAgentTools(agentId, toolConfig)
}

/**
 * Sync agent_tools table with tool_config
 */
async function syncAgentTools(
  agentId: string,
  toolConfig: Record<string, any>
): Promise<void> {
  const supabase = await createClient()

  // Get existing tools
  const { data: existingTools } = await supabase
    .from('agent_tools')
    .select('*')
    .eq('agent_id', agentId)

  const existingToolNames = new Set(existingTools?.map((t) => t.tool_name) || [])

  // Add new tools
  for (const [toolName, config] of Object.entries(toolConfig)) {
    if (!existingToolNames.has(toolName)) {
      await supabase.from('agent_tools').insert({
        agent_id: agentId,
        tool_name: toolName,
        tool_config: config.config || {},
        is_enabled: config.enabled !== false,
      })
    } else {
      // Update existing tool
      await supabase
        .from('agent_tools')
        .update({
          tool_config: config.config || {},
          is_enabled: config.enabled !== false,
        })
        .eq('agent_id', agentId)
        .eq('tool_name', toolName)
    }
  }

  // Disable tools not in config
  const configToolNames = new Set(Object.keys(toolConfig))
  for (const existingTool of existingTools || []) {
    if (!configToolNames.has(existingTool.tool_name)) {
      await supabase
        .from('agent_tools')
        .update({ is_enabled: false })
        .eq('id', existingTool.id)
    }
  }
}

/**
 * Check if agent has executable instructions
 */
export async function hasExecutableInstructions(agentId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('instruction_prompt, tool_config')
    .eq('id', agentId)
    .single()

  if (!agent) return false

  return !!(
    agent.instruction_prompt &&
    agent.tool_config &&
    Object.keys(agent.tool_config).length > 0
  )
}

/**
 * Get agent execution readiness status
 */
export async function getExecutionReadiness(agentId: string): Promise<{
  ready: boolean
  issues: string[]
}> {
  const supabase = await createClient()

  const issues: string[] = []

  // Check agent exists
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return { ready: false, issues: ['Agent not found'] }
  }

  // Check instruction prompt
  if (!agent.instruction_prompt) {
    issues.push('No instruction prompt - run auto-generate')
  }

  // Check tool config
  if (!agent.tool_config || Object.keys(agent.tool_config).length === 0) {
    issues.push('No tools configured')
  }

  // Check enabled tools
  const { data: tools } = await supabase
    .from('agent_tools')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_enabled', true)

  if (!tools || tools.length === 0) {
    issues.push('No enabled tools')
  }

  return {
    ready: issues.length === 0,
    issues,
  }
}
