// Memory Tools: memory_search, memory_get, memory_store (OpenClaw pattern)

import type { AgentTool } from '../types'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * Memory search tool
 */
export function createMemorySearchTool(agentId: string): AgentTool {
  return {
    name: 'memory_search',
    description: 'Search agent memory for relevant information. Uses semantic search to find related memories.',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Maximum number of results (default: 5)'),
      memoryType: z.enum(['long_term', 'daily_log', 'fact', 'conversation']).optional().describe('Filter by memory type'),
    }).parse,
    execute: async ({ query, limit = 5, memoryType }) => {
      const supabase = await createClient()

      let queryBuilder = supabase
        .from('agent_memory_entries')
        .select('*')
        .eq('agent_id', agentId)
        .order('importance_score', { ascending: false })
        .limit(limit)

      if (memoryType) {
        queryBuilder = queryBuilder.eq('memory_type', memoryType)
      }

      // TODO: Implement vector similarity search
      // For now, use text search
      queryBuilder = queryBuilder.textSearch('content', query)

      const { data, error } = await queryBuilder

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      // Update access count
      if (data && data.length > 0) {
        const ids = data.map((m) => m.id)
        await supabase
          .from('agent_memory_entries')
          .update({
            access_count: supabase.rpc('increment', { row_id: ids }),
            last_accessed_at: new Date().toISOString(),
          })
          .in('id', ids)
      }

      return {
        success: true,
        results: data?.map((m) => ({
          id: m.id,
          content: m.content,
          summary: m.summary,
          type: m.memory_type,
          importance: m.importance_score,
          tags: m.tags,
          createdAt: m.created_at,
        })) ?? [],
        query,
      }
    },
    metadata: {
      category: 'memory',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Memory get tool
 */
export function createMemoryGetTool(agentId: string): AgentTool {
  return {
    name: 'memory_get',
    description: 'Retrieve a specific memory by ID.',
    inputSchema: z.object({
      memoryId: z.string().describe('Memory ID to retrieve'),
    }).parse,
    execute: async ({ memoryId }) => {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('agent_memory_entries')
        .select('*')
        .eq('id', memoryId)
        .eq('agent_id', agentId)
        .single()

      if (error || !data) {
        return {
          success: false,
          error: error?.message ?? 'Memory not found',
        }
      }

      // Update access count
      await supabase
        .from('agent_memory_entries')
        .update({
          access_count: data.access_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', memoryId)

      return {
        success: true,
        memory: {
          id: data.id,
          content: data.content,
          summary: data.summary,
          type: data.memory_type,
          importance: data.importance_score,
          tags: data.tags,
          createdAt: data.created_at,
          accessCount: data.access_count + 1,
        },
      }
    },
    metadata: {
      category: 'memory',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Memory store tool
 */
export function createMemoryStoreTool(agentId: string): AgentTool {
  return {
    name: 'memory_store',
    description: 'Store a new memory. Use this to remember important information for future reference.',
    inputSchema: z.object({
      content: z.string().describe('Memory content to store'),
      summary: z.string().optional().describe('Brief summary of the memory'),
      memoryType: z.enum(['long_term', 'daily_log', 'fact', 'conversation']).describe('Type of memory'),
      importance: z.number().min(0).max(1).optional().describe('Importance score (0-1, default: 0.5)'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
    }).parse,
    execute: async ({ content, summary, memoryType, importance = 0.5, tags = [] }) => {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('agent_memory_entries')
        .insert({
          agent_id: agentId,
          content,
          summary,
          memory_type: memoryType,
          importance_score: importance,
          tags,
          access_count: 0,
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        memoryId: data.id,
        message: 'Memory stored successfully',
      }
    },
    metadata: {
      category: 'memory',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Memory update tool
 */
export function createMemoryUpdateTool(agentId: string): AgentTool {
  return {
    name: 'memory_update',
    description: 'Update an existing memory.',
    inputSchema: z.object({
      memoryId: z.string().describe('Memory ID to update'),
      content: z.string().optional().describe('New content'),
      summary: z.string().optional().describe('New summary'),
      importance: z.number().min(0).max(1).optional().describe('New importance score'),
      tags: z.array(z.string()).optional().describe('New tags'),
    }).parse,
    execute: async ({ memoryId, content, summary, importance, tags }) => {
      const supabase = await createClient()

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (content !== undefined) updates.content = content
      if (summary !== undefined) updates.summary = summary
      if (importance !== undefined) updates.importance_score = importance
      if (tags !== undefined) updates.tags = tags

      const { error } = await supabase
        .from('agent_memory_entries')
        .update(updates)
        .eq('id', memoryId)
        .eq('agent_id', agentId)

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        message: 'Memory updated successfully',
      }
    },
    metadata: {
      category: 'memory',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

export function createMemoryTools(agentId: string): AgentTool[] {
  return [
    createMemorySearchTool(agentId),
    createMemoryGetTool(agentId),
    createMemoryStoreTool(agentId),
    createMemoryUpdateTool(agentId),
  ]
}
