// Tool Policy System: Fine-grained tool access control (OpenClaw pattern)

import type { AgentTool, ToolPolicy } from './types'
import { TOOL_PROFILES, TOOL_CATEGORIES } from './types'
import { createClient } from '@/lib/supabase/server'

/**
 * Load tool policy for an agent
 */
export async function loadToolPolicy(agentId: string): Promise<ToolPolicy> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_tool_policies')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .single()

  if (!data) {
    // Default policy: coding profile
    return {
      profile: 'coding',
      maxToolCallsPerTurn: 10,
    }
  }

  return {
    profile: data.profile as ToolPolicy['profile'],
    allowedTools: data.allowed_tools ?? undefined,
    deniedTools: data.denied_tools ?? undefined,
    ownerOnlyTools: data.owner_only_tools ?? undefined,
    maxToolCallsPerTurn: data.max_tool_calls_per_turn ?? 10,
  }
}

/**
 * Save tool policy for an agent
 */
export async function saveToolPolicy(
  agentId: string,
  policy: ToolPolicy
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('agent_tool_policies')
    .upsert({
      agent_id: agentId,
      profile: policy.profile ?? null,
      allowed_tools: policy.allowedTools ?? [],
      denied_tools: policy.deniedTools ?? [],
      owner_only_tools: policy.ownerOnlyTools ?? [],
      max_tool_calls_per_turn: policy.maxToolCallsPerTurn ?? 10,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
}

/**
 * Filter tools based on policy
 */
export function filterToolsByPolicy(
  tools: AgentTool[],
  policy: ToolPolicy,
  isOwner: boolean = false
): AgentTool[] {
  let filtered = [...tools]

  // Apply profile filter
  if (policy.profile && policy.profile !== 'full') {
    const profileTools = TOOL_PROFILES[policy.profile] ?? []
    filtered = filtered.filter((tool) => profileTools.includes(tool.name))
  }

  // Apply explicit allow list
  if (policy.allowedTools && policy.allowedTools.length > 0) {
    filtered = filtered.filter((tool) => {
      // Check exact match
      if (policy.allowedTools!.includes(tool.name)) return true

      // Check wildcard patterns
      return policy.allowedTools!.some((pattern) => {
        if (pattern === '*') return true
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1)
          return tool.name.startsWith(prefix)
        }
        return false
      })
    })
  }

  // Apply explicit deny list
  if (policy.deniedTools && policy.deniedTools.length > 0) {
    filtered = filtered.filter((tool) => {
      // Check exact match
      if (policy.deniedTools!.includes(tool.name)) return false

      // Check wildcard patterns
      return !policy.deniedTools!.some((pattern) => {
        if (pattern === '*') return true
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1)
          return tool.name.startsWith(prefix)
        }
        return false
      })
    })
  }

  // Apply owner-only restrictions
  if (!isOwner && policy.ownerOnlyTools && policy.ownerOnlyTools.length > 0) {
    filtered = filtered.filter((tool) => !policy.ownerOnlyTools!.includes(tool.name))
  }

  // Filter out tools marked as ownerOnly in metadata
  if (!isOwner) {
    filtered = filtered.filter((tool) => !tool.metadata?.ownerOnly)
  }

  return filtered
}

/**
 * Check if a specific tool is allowed
 */
export function isToolAllowed(
  toolName: string,
  policy: ToolPolicy,
  isOwner: boolean = false
): boolean {
  // Check owner-only restrictions
  if (!isOwner) {
    if (policy.ownerOnlyTools?.includes(toolName)) {
      return false
    }
  }

  // Check deny list
  if (policy.deniedTools?.includes(toolName)) {
    return false
  }

  // Check allow list
  if (policy.allowedTools && policy.allowedTools.length > 0) {
    return policy.allowedTools.includes(toolName) || policy.allowedTools.includes('*')
  }

  // Check profile
  if (policy.profile && policy.profile !== 'full') {
    const profileTools = TOOL_PROFILES[policy.profile] ?? []
    return profileTools.includes(toolName) || profileTools.includes('*')
  }

  // Default: allow
  return true
}

/**
 * Get tools by category
 */
export function getToolsByCategory(
  tools: AgentTool[],
  category: keyof typeof TOOL_CATEGORIES
): AgentTool[] {
  const categoryTools = TOOL_CATEGORIES[category]
  return tools.filter((tool) => categoryTools.includes(tool.name))
}

/**
 * Validate tool call count
 */
export function validateToolCallCount(
  currentCount: number,
  policy: ToolPolicy
): { allowed: boolean; error?: string } {
  const maxCalls = policy.maxToolCallsPerTurn ?? 10

  if (currentCount >= maxCalls) {
    return {
      allowed: false,
      error: `Maximum tool calls per turn (${maxCalls}) exceeded`,
    }
  }

  return { allowed: true }
}

/**
 * Create default tool policy for new agents
 */
export async function createDefaultToolPolicy(
  agentId: string,
  category: string
): Promise<void> {
  const supabase = await createClient()

  // Determine profile based on agent category
  let profile: ToolPolicy['profile'] = 'coding'

  if (category === 'customer_support' || category === 'personal_assistant') {
    profile = 'messaging'
  } else if (category === 'research_agent') {
    profile = 'minimal'
  } else if (category === 'content_creation' || category === 'data_analysis') {
    profile = 'coding'
  }

  await supabase.from('agent_tool_policies').insert({
    agent_id: agentId,
    profile,
    policy_type: 'profile',
    max_tool_calls_per_turn: 10,
    is_active: true,
  })
}

/**
 * Get tool usage statistics
 */
export async function getToolUsageStats(
  agentId: string,
  timeRangeHours: number = 24
): Promise<Record<string, number>> {
  const supabase = await createClient()

  const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await supabase
    .from('agent_sessions')
    .select('id')
    .eq('agent_id', agentId)

  if (!sessions || sessions.length === 0) {
    return {}
  }

  const sessionIds = sessions.map((s) => s.id)

  const { data: executions } = await supabase
    .from('tool_executions')
    .select('tool_name')
    .in('session_id', sessionIds)
    .gte('created_at', since)

  const stats: Record<string, number> = {}

  executions?.forEach((exec) => {
    stats[exec.tool_name] = (stats[exec.tool_name] ?? 0) + 1
  })

  return stats
}
