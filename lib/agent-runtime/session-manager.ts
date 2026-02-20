// Session Manager: JSONL-style transcript persistence (OpenClaw pattern)

import type { SessionMessage, AgentMemory } from './types'
import { createClient } from '@/lib/supabase/server'

export class SessionManager {
  private sessionId: string
  private agentId: string

  constructor(sessionId: string, agentId: string) {
    this.sessionId = sessionId
    this.agentId = agentId
  }

  /**
   * Initialize or get existing session
   */
  static async getOrCreate(
    agentId: string,
    sessionKey?: string,
    sessionType: 'runtime' | 'builder' | 'subagent' = 'runtime'
  ): Promise<SessionManager> {
    const supabase = await createClient()

    // Generate session key if not provided
    const key = sessionKey ?? `agent:${agentId}:${sessionType}:${Date.now()}`

    // Try to get existing session
    let { data: session } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('session_key', key)
      .single()

    // Create if doesn't exist
    if (!session) {
      const { data: newSession, error } = await supabase
        .from('agent_sessions')
        .insert({
          agent_id: agentId,
          session_key: key,
          session_type: sessionType,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      session = newSession
    }

    return new SessionManager(session.id, agentId)
  }

  /**
   * Append message to session transcript
   */
  async appendMessage(message: Omit<SessionMessage, 'id' | 'createdAt'>): Promise<SessionMessage> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('session_messages')
      .insert({
        session_id: this.sessionId,
        role: message.role,
        content: message.content,
        tool_calls: message.toolCalls ?? null,
        tool_results: message.toolResults ?? null,
        tokens_used: message.tokensUsed ?? null,
        metadata: message.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error

    // Update session stats
    await supabase
      .from('agent_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: await this.getMessageCount(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId)

    return {
      id: data.id,
      role: data.role as SessionMessage['role'],
      content: data.content,
      toolCalls: data.tool_calls,
      toolResults: data.tool_results,
      tokensUsed: data.tokens_used,
      metadata: data.metadata,
      createdAt: data.created_at,
    }
  }

  /**
   * Get session history
   */
  async getHistory(options: {
    limit?: number
    includeTools?: boolean
    afterMessageId?: string
  } = {}): Promise<SessionMessage[]> {
    const supabase = await createClient()

    let query = supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: true })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.afterMessageId) {
      const { data: afterMsg } = await supabase
        .from('session_messages')
        .select('created_at')
        .eq('id', options.afterMessageId)
        .single()

      if (afterMsg) {
        query = query.gt('created_at', afterMsg.created_at)
      }
    }

    const { data, error } = await query

    if (error) throw error

    let messages = data.map((msg) => ({
      id: msg.id,
      role: msg.role as SessionMessage['role'],
      content: msg.content,
      toolCalls: msg.tool_calls,
      toolResults: msg.tool_results,
      tokensUsed: msg.tokens_used,
      metadata: msg.metadata,
      createdAt: msg.created_at,
    }))

    // Filter out tool messages if requested
    if (!options.includeTools) {
      messages = messages.filter((msg) => msg.role !== 'tool')
    }

    return messages
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('session_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', this.sessionId)

    if (error) throw error
    return count ?? 0
  }

  /**
   * Get token count
   */
  async getTokenCount(): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('session_messages')
      .select('tokens_used')
      .eq('session_id', this.sessionId)

    if (error) throw error

    return data.reduce((sum, msg) => sum + (msg.tokens_used ?? 0), 0)
  }

  /**
   * Compact session (summarize old messages)
   */
  async compact(options: {
    keepRecentMessages: number
    targetTokenCount: number
  }): Promise<{ summary: string; messagesSummarized: number; tokensSaved: number }> {
    const supabase = await createClient()

    // Get all messages
    const messages = await this.getHistory()

    if (messages.length <= options.keepRecentMessages) {
      return { summary: '', messagesSummarized: 0, tokensSaved: 0 }
    }

    // Split into old (to summarize) and recent (to keep)
    const oldMessages = messages.slice(0, -options.keepRecentMessages)
    const recentMessages = messages.slice(-options.keepRecentMessages)

    // Create summary of old messages
    const summary = this.createSummary(oldMessages)

    // Calculate tokens saved
    const tokensSaved = oldMessages.reduce((sum, msg) => sum + (msg.tokensUsed ?? 0), 0)

    // Store snapshot
    await supabase.from('agent_context_snapshots').insert({
      session_id: this.sessionId,
      snapshot_type: 'compaction',
      summary,
      original_message_count: oldMessages.length,
      compressed_message_count: 1,
      tokens_saved: tokensSaved,
    })

    // Delete old messages (keep recent ones)
    const oldMessageIds = oldMessages.map((msg) => msg.id)
    await supabase
      .from('session_messages')
      .delete()
      .in('id', oldMessageIds)

    // Insert summary as system message
    await this.appendMessage({
      role: 'system',
      content: `[Context Summary]\n${summary}`,
      metadata: { type: 'compaction_summary', originalMessageCount: oldMessages.length },
    })

    return {
      summary,
      messagesSummarized: oldMessages.length,
      tokensSaved,
    }
  }

  /**
   * Create summary from messages
   */
  private createSummary(messages: SessionMessage[]): string {
    const summaryParts: string[] = []

    // Group by conversation turns
    let currentTurn: SessionMessage[] = []

    for (const msg of messages) {
      if (msg.role === 'user') {
        if (currentTurn.length > 0) {
          summaryParts.push(this.summarizeTurn(currentTurn))
        }
        currentTurn = [msg]
      } else {
        currentTurn.push(msg)
      }
    }

    if (currentTurn.length > 0) {
      summaryParts.push(this.summarizeTurn(currentTurn))
    }

    return summaryParts.join('\n\n')
  }

  /**
   * Summarize a conversation turn
   */
  private summarizeTurn(messages: SessionMessage[]): string {
    const userMsg = messages.find((m) => m.role === 'user')
    const assistantMsg = messages.find((m) => m.role === 'assistant')
    const toolCalls = messages.filter((m) => m.role === 'tool')

    let summary = ''

    if (userMsg) {
      summary += `User: ${this.truncate(userMsg.content, 100)}\n`
    }

    if (toolCalls.length > 0) {
      summary += `Tools used: ${toolCalls.map((t) => t.toolCalls?.[0]?.name).filter(Boolean).join(', ')}\n`
    }

    if (assistantMsg) {
      summary += `Assistant: ${this.truncate(assistantMsg.content, 150)}`
    }

    return summary
  }

  /**
   * Truncate text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  /**
   * Archive session
   */
  async archive(): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('agent_sessions')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId)
  }

  /**
   * Get session metadata
   */
  async getMetadata(): Promise<{
    sessionKey: string
    messageCount: number
    tokenCount: number
    lastMessageAt: string
    status: string
  }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', this.sessionId)
      .single()

    if (error) throw error

    return {
      sessionKey: data.session_key,
      messageCount: data.message_count ?? 0,
      tokenCount: data.token_count ?? 0,
      lastMessageAt: data.last_message_at,
      status: data.status,
    }
  }
}
