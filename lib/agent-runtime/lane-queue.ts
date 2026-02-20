// Lane Queue: Per-session serial execution (OpenClaw pattern)
// Prevents race conditions by serializing runs per session

import type { LaneQueueItem, AgentRunResult } from './types'
import { createClient } from '@/lib/supabase/server'

class LaneQueue {
  private queues: Map<string, Promise<unknown>> = new Map()
  private globalQueue: Promise<unknown> = Promise.resolve()

  /**
   * Enqueue a task for a specific session lane
   * Returns immediately with runId, executes in background
   */
  async enqueue(
    sessionKey: string,
    task: () => Promise<AgentRunResult>,
    options: {
      priority?: number
      useGlobalLane?: boolean
    } = {}
  ): Promise<{ runId: string; acceptedAt: Date }> {
    const runId = crypto.randomUUID()
    const acceptedAt = new Date()

    // Create queue item
    const item: LaneQueueItem = {
      runId,
      sessionId: sessionKey,
      priority: options.priority ?? 0,
      task,
      queuedAt: acceptedAt,
    }

    // Get or create session lane
    const currentLane = this.queues.get(sessionKey) ?? Promise.resolve()

    // Chain the new task
    const newLane = currentLane
      .then(() => this.executeTask(item))
      .catch((error) => {
        console.error(`[LaneQueue] Task ${runId} failed:`, error)
        return {
          runId,
          status: 'error' as const,
          error: error.message,
          tokensUsed: 0,
          executionTimeMs: 0,
          toolCallsCount: 0,
        }
      })

    // Update session lane
    this.queues.set(sessionKey, newLane)

    // Optional global serialization
    if (options.useGlobalLane) {
      this.globalQueue = this.globalQueue.then(() => newLane)
    }

    // Clean up completed lanes
    newLane.finally(() => {
      if (this.queues.get(sessionKey) === newLane) {
        this.queues.delete(sessionKey)
      }
    })

    return { runId, acceptedAt }
  }

  /**
   * Execute a queued task with tracking
   */
  private async executeTask(item: LaneQueueItem): Promise<AgentRunResult> {
    const startTime = Date.now()
    const supabase = await createClient()

    try {
      // Update queue status to running
      await supabase
        .from('agent_run_queue')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('run_id', item.runId)

      // Execute the task
      const result = await item.task()

      // Update queue status to completed
      await supabase
        .from('agent_run_queue')
        .update({
          status: result.status === 'error' ? 'error' : 'completed',
          completed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          tokens_used: result.tokensUsed,
          output_message: result.message,
          error_message: result.error,
        })
        .eq('run_id', item.runId)

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Update queue status to error
      await supabase
        .from('agent_run_queue')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: errorMessage,
        })
        .eq('run_id', item.runId)

      throw error
    }
  }

  /**
   * Wait for a specific run to complete
   */
  async waitForRun(
    runId: string,
    timeoutMs: number = 30000
  ): Promise<AgentRunResult> {
    const supabase = await createClient()
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const { data } = await supabase
        .from('agent_run_queue')
        .select('*')
        .eq('run_id', runId)
        .single()

      if (!data) {
        throw new Error(`Run ${runId} not found`)
      }

      if (data.status === 'completed') {
        return {
          runId,
          status: 'completed',
          message: data.output_message,
          tokensUsed: data.tokens_used ?? 0,
          executionTimeMs: data.execution_time_ms ?? 0,
          toolCallsCount: 0,
        }
      }

      if (data.status === 'error') {
        return {
          runId,
          status: 'error',
          error: data.error_message,
          tokensUsed: data.tokens_used ?? 0,
          executionTimeMs: data.execution_time_ms ?? 0,
          toolCallsCount: 0,
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Timeout
    return {
      runId,
      status: 'timeout',
      error: 'Run timed out',
      tokensUsed: 0,
      executionTimeMs: timeoutMs,
      toolCallsCount: 0,
    }
  }

  /**
   * Get queue status for a session
   */
  async getQueueStatus(sessionKey: string): Promise<{
    queued: number
    running: number
    completed: number
  }> {
    const supabase = await createClient()

    const { data: sessions } = await supabase
      .from('agent_sessions')
      .select('id')
      .eq('session_key', sessionKey)
      .single()

    if (!sessions) {
      return { queued: 0, running: 0, completed: 0 }
    }

    const { data: queue } = await supabase
      .from('agent_run_queue')
      .select('status')
      .eq('session_id', sessions.id)

    const counts = {
      queued: 0,
      running: 0,
      completed: 0,
    }

    queue?.forEach((item) => {
      if (item.status === 'queued') counts.queued++
      if (item.status === 'running') counts.running++
      if (item.status === 'completed') counts.completed++
    })

    return counts
  }
}

// Singleton instance
export const laneQueue = new LaneQueue()
