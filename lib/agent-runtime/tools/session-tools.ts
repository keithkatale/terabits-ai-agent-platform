// Session Tools: Multi-agent coordination (OpenClaw pattern)
// sessions_list, sessions_history, sessions_send, sessions_spawn

import type { AgentTool } from '../types'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * Sessions list tool
 */
export function createSessionsListTool(agentId: string): AgentTool {
  return {
    name: 'sessions_list',
    description: 'List all active sessions for this agent. Use to discover other conversations or sub-agents.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Maximum number of sessions to return (default: 20)'),
      sessionType: z.enum(['runtime', 'builder', 'subagent']).optional().describe('Filter by session type'),
    }).parse,
    execute: async ({ limit = 20, sessionType }) => {
      const supabase = await createClient()

      let query = supabase
        .from('agent_sessions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(limit)

      if (sessionType) {
        query = query.eq('session_type', sessionType)
      }

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        sessions: data?.map((s) => ({
          sessionKey: s.session_key,
          sessionType: s.session_type,
          messageCount: s.message_count,
          lastMessageAt: s.last_message_at,
          status: s.status,
        })) ?? [],
      }
    },
    metadata: {
      category: 'session',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Sessions history tool
 */
export function createSessionsHistoryTool(agentId: string): AgentTool {
  return {
    name: 'sessions_history',
    description: 'Get message history from another session. Use to understand what happened in a different conversation.',
    inputSchema: z.object({
      sessionKey: z.string().describe('Session key to retrieve history from'),
      limit: z.number().optional().describe('Maximum number of messages (default: 20)'),
      includeTools: z.boolean().optional().describe('Include tool messages (default: false)'),
    }).parse,
    execute: async ({ sessionKey, limit = 20, includeTools = false }) => {
      const supabase = await createClient()

      // Get session
      const { data: session } = await supabase
        .from('agent_sessions')
        .select('id')
        .eq('session_key', sessionKey)
        .eq('agent_id', agentId)
        .single()

      if (!session) {
        return {
          success: false,
          error: 'Session not found or access denied',
        }
      }

      // Get messages
      let query = supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (!includeTools) {
        query = query.neq('role', 'tool')
      }

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        sessionKey,
        messages: data?.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        })) ?? [],
      }
    },
    metadata: {
      category: 'session',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Sessions send tool
 */
export function createSessionsSendTool(agentId: string): AgentTool {
  return {
    name: 'sessions_send',
    description: 'Send a message to another session. Use for agent-to-agent communication.',
    inputSchema: z.object({
      sessionKey: z.string().describe('Target session key'),
      message: z.string().describe('Message to send'),
      waitForReply: z.boolean().optional().describe('Wait for reply (default: false)'),
      timeoutSeconds: z.number().optional().describe('Timeout in seconds (default: 30)'),
    }).parse,
    execute: async ({ sessionKey, message, waitForReply = false, timeoutSeconds = 30 }) => {
      // TODO: Implement inter-session messaging
      return {
        success: false,
        error: 'Inter-session messaging not yet implemented',
        note: 'This requires agent-to-agent communication infrastructure',
      }
    },
    metadata: {
      category: 'session',
      ownerOnly: false,
      requiresApproval: true,
    },
  }
}

/**
 * Sessions spawn tool
 */
export function createSessionsSpawnTool(agentId: string): AgentTool {
  return {
    name: 'sessions_spawn',
    description: 'Spawn a sub-agent to handle a specific task. The sub-agent runs independently and reports back.',
    inputSchema: z.object({
      task: z.string().describe('Task description for the sub-agent'),
      label: z.string().optional().describe('Label for the sub-agent session'),
      timeoutSeconds: z.number().optional().describe('Timeout in seconds (default: 300)'),
    }).parse,
    execute: async ({ task, label, timeoutSeconds = 300 }) => {
      // TODO: Implement sub-agent spawning
      return {
        success: false,
        error: 'Sub-agent spawning not yet implemented',
        note: 'This requires sub-agent orchestration infrastructure',
      }
    },
    metadata: {
      category: 'session',
      ownerOnly: false,
      requiresApproval: true,
    },
  }
}

export function createSessionTools(agentId: string): AgentTool[] {
  return [
    createSessionsListTool(agentId),
    createSessionsHistoryTool(agentId),
    createSessionsSendTool(agentId),
    createSessionsSpawnTool(agentId),
  ]
}
