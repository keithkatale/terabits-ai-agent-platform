// Agent Loop: Core execution engine (OpenClaw's runEmbeddedPiAgent pattern)

import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { AgentRunConfig, AgentRunResult, StreamEvent } from './types'
import { SessionManager } from './session-manager'
import { laneQueue } from './lane-queue'
import { filterToolsByPolicy } from './tool-policy'
import { createClient } from '@/lib/supabase/server'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

/**
 * Main agent execution loop
 * This is the core of the OpenClaw-inspired runtime
 */
export async function runAgentLoop(
  config: AgentRunConfig,
  onStream?: (event: StreamEvent) => void
): Promise<AgentRunResult> {
  const startTime = Date.now()
  let tokensUsed = 0
  let toolCallsCount = 0

  try {
    // 1. Initialize session manager
    const sessionManager = await SessionManager.getOrCreate(
      config.agentId,
      config.sessionKey,
      'runtime'
    )

    // 2. Emit lifecycle start event
    onStream?.({
      type: 'lifecycle',
      phase: 'start',
      metadata: { sessionKey: config.sessionKey, agentId: config.agentId },
    })

    // 3. Load session history
    const history = await sessionManager.getHistory({ limit: 50 })

    // 4. Append user message
    await sessionManager.appendMessage({
      role: 'user',
      content: config.message,
    })

    // 5. Filter tools by policy
    const allowedTools = filterToolsByPolicy(
      config.tools,
      { maxToolCallsPerTurn: config.maxToolCalls ?? 10 },
      false // TODO: Check if user is owner
    )

    // 6. Convert tools to AI SDK format
    const aiTools = convertToolsToAIFormat(allowedTools, config.sessionId, onStream)

    // 7. Build messages array
    const messages = [
      ...history.map((msg) => ({
        role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: config.message,
      },
    ]

    // 8. Execute model with streaming
    const result = streamText({
      model: google(config.model || 'gemini-2.5-flash'),
      system: config.systemPrompt,
      messages,
      tools: aiTools,
      temperature: config.temperature ?? 0.7,
      onChunk: ({ chunk }) => {
        // Stream assistant deltas
        if (chunk.type === 'text-delta') {
          onStream?.({
            type: 'assistant',
            content: chunk.text,
          })
        }
      },
      onFinish: ({ usage }) => {
        tokensUsed = usage?.totalTokens ?? 0
      },
    })

    // 9. Collect full response
    let fullResponse = ''
    const toolCalls: any[] = []
    const toolResults: any[] = []

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        fullResponse += chunk.text
      } else if (chunk.type === 'tool-call') {
        toolCalls.push(chunk)
        toolCallsCount++
      } else if (chunk.type === 'tool-result') {
        toolResults.push(chunk)
      }
    }

    // 10. Save assistant message
    await sessionManager.appendMessage({
      role: 'assistant',
      content: fullResponse,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      tokensUsed,
    })

    // 11. Check if compaction is needed
    const messageCount = await sessionManager.getMessageCount()
    const tokenCount = await sessionManager.getTokenCount()

    if (tokenCount > 8000 || messageCount > 50) {
      await sessionManager.compact({
        keepRecentMessages: 10,
        targetTokenCount: 4000,
      })
    }

    // 12. Emit lifecycle end event
    onStream?.({
      type: 'lifecycle',
      phase: 'end',
      metadata: {
        tokensUsed,
        toolCallsCount,
        executionTimeMs: Date.now() - startTime,
      },
    })

    return {
      runId: config.sessionId,
      status: 'completed',
      message: fullResponse,
      tokensUsed,
      executionTimeMs: Date.now() - startTime,
      toolCallsCount,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Emit lifecycle error event
    onStream?.({
      type: 'lifecycle',
      phase: 'error',
      error: errorMessage,
    })

    return {
      runId: config.sessionId,
      status: 'error',
      error: errorMessage,
      tokensUsed,
      executionTimeMs: Date.now() - startTime,
      toolCallsCount,
    }
  }
}

/**
 * Enqueue agent run (returns immediately)
 */
export async function enqueueAgentRun(
  config: AgentRunConfig,
  onStream?: (event: StreamEvent) => void
): Promise<{ runId: string; acceptedAt: Date }> {
  const supabase = await createClient()

  // Generate run ID
  const runId = crypto.randomUUID()

  // Insert into queue
  await supabase.from('agent_run_queue').insert({
    session_id: config.sessionId,
    run_id: runId,
    status: 'queued',
    input_message: config.message,
    metadata: {
      agentId: config.agentId,
      model: config.model,
    },
  })

  // Enqueue in lane queue
  const { acceptedAt } = await laneQueue.enqueue(
    config.sessionKey,
    () => runAgentLoop(config, onStream),
    { priority: 0 }
  )

  return { runId, acceptedAt }
}

/**
 * Wait for agent run to complete
 */
export async function waitForAgentRun(
  runId: string,
  timeoutMs: number = 30000
): Promise<AgentRunResult> {
  return laneQueue.waitForRun(runId, timeoutMs)
}

/**
 * Convert AgentTool to AI SDK tool format
 */
function convertToolsToAIFormat(
  tools: any[],
  sessionId: string,
  onStream?: (event: StreamEvent) => void
): Record<string, any> {
  const aiTools: Record<string, any> = {}

  for (const tool of tools) {
    aiTools[tool.name] = {
      description: tool.description,
      parameters: tool.inputSchema,
      execute: async (args: Record<string, unknown>) => {
        const supabase = await createClient()
        const executionId = crypto.randomUUID()
        const startTime = Date.now()

        try {
          // Emit tool start event
          onStream?.({
            type: 'tool',
            toolName: tool.name,
            toolState: 'running',
            toolInput: args,
          })

          // Log tool execution start
          await supabase.from('tool_executions').insert({
            id: executionId,
            session_id: sessionId,
            tool_name: tool.name,
            tool_input: args,
            status: 'running',
            started_at: new Date().toISOString(),
          })

          // Execute tool
          const result = await tool.execute(args)

          // Log tool execution completion
          await supabase
            .from('tool_executions')
            .update({
              status: 'completed',
              tool_output: result,
              execution_time_ms: Date.now() - startTime,
              completed_at: new Date().toISOString(),
            })
            .eq('id', executionId)

          // Emit tool completion event
          onStream?.({
            type: 'tool',
            toolName: tool.name,
            toolState: 'completed',
            toolOutput: result,
          })

          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          // Log tool execution error
          await supabase
            .from('tool_executions')
            .update({
              status: 'error',
              error_message: errorMessage,
              execution_time_ms: Date.now() - startTime,
              completed_at: new Date().toISOString(),
            })
            .eq('id', executionId)

          // Emit tool error event
          onStream?.({
            type: 'tool',
            toolName: tool.name,
            toolState: 'error',
            error: errorMessage,
          })

          throw error
        }
      },
    }
  }

  return aiTools
}
