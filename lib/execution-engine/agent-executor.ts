// Core agent execution engine
// This is where the magic happens - spawning AI instances with instructions

import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { toolRegistry } from './tool-registry'
import type {
  AgentExecutionInput,
  AgentExecutionConfig,
  ExecutionResult,
  ExecutionEvent,
  StreamCallback,
  ToolCall,
} from './types'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

/**
 * Execute an agent with its instructions
 * This spawns an isolated AI instance that follows the agent's instructions
 */
export async function executeAgent(
  input: AgentExecutionInput,
  onStream?: StreamCallback
): Promise<ExecutionResult> {
  const startTime = Date.now()
  const supabase = await createClient()

  // Generate session ID if not provided
  const sessionId = input.sessionId || `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  try {
    // 1. Load agent configuration from database
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', input.agentId)
      .single()

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${input.agentId}`)
    }

    // 2. Create execution record
    const { data: execution, error: execError } = await supabase
      .from('agent_executions')
      .insert({
        agent_id: input.agentId,
        user_id: input.userId,
        session_id: sessionId,
        input: input.input,
        status: 'running',
      })
      .select()
      .single()

    if (execError || !execution) {
      throw new Error('Failed to create execution record')
    }

    // 3. Build execution config
    const config: AgentExecutionConfig = {
      instructionPrompt: agent.instruction_prompt || generateDefaultPrompt(agent),
      toolConfig: agent.tool_config || {},
      executionContext: agent.execution_context || {},
      mcpServers: agent.mcp_servers || [],
      model: agent.model || 'gemini-2.0-flash-exp',
    }

    // 4. Emit start event
    emitEvent(onStream, {
      type: 'lifecycle',
      phase: 'start',
      metadata: { sessionId, executionId: execution.id },
      timestamp: new Date(),
    })

    // 5. Load enabled tools
    const enabledTools = await loadEnabledTools(input.agentId, config.toolConfig)

    // 6. Build system prompt with context
    const systemPrompt = buildSystemPrompt(config, input.input)

    // 7. Execute with AI
    const result = await executeWithAI({
      systemPrompt,
      userInput: formatUserInput(input.input),
      tools: enabledTools,
      model: config.model,
      sessionId,
      executionId: execution.id,
      onStream,
    })

    // 8. Update execution record
    await supabase
      .from('agent_executions')
      .update({
        status: 'completed',
        output: result.output,
        tool_calls: result.toolCalls,
        tokens_used: result.tokensUsed,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id)

    // 9. Emit end event
    emitEvent(onStream, {
      type: 'lifecycle',
      phase: 'end',
      metadata: { result: result.output },
      timestamp: new Date(),
    })

    return {
      executionId: execution.id,
      sessionId,
      status: 'completed',
      output: result.output,
      toolCalls: result.toolCalls,
      tokensUsed: result.tokensUsed,
      executionTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    emitEvent(onStream, {
      type: 'error',
      error: errorMessage,
      timestamp: new Date(),
    })

    // Update execution record if it exists
    try {
      await supabase
        .from('agent_executions')
        .update({
          status: 'error',
          error_message: errorMessage,
          execution_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
    } catch (updateError) {
      console.error('Failed to update execution record:', updateError)
    }

    throw error
  }
}

/**
 * Execute with AI model
 */
async function executeWithAI(params: {
  systemPrompt: string
  userInput: string
  tools: any[]
  model: string
  sessionId: string
  executionId: string
  onStream?: StreamCallback
}): Promise<{
  output: Record<string, unknown>
  toolCalls: ToolCall[]
  tokensUsed: number
}> {
  const toolCalls: ToolCall[] = []
  let tokensUsed = 0
  let fullText = ''

  const result = await streamText({
    model: google(params.model),
    system: params.systemPrompt,
    messages: [
      {
        role: 'user',
        content: params.userInput,
      },
    ],
    tools: params.tools,
    maxTokens: 8192,
    temperature: 0.7,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: -1,  // Dynamic — model decides how much to think
          includeThoughts: true,
        },
      },
    },
    onFinish: (event) => {
      tokensUsed = event.usage?.totalTokens || 0
    },
  })

  // Stream everything: reasoning, text deltas, tool calls, tool results
  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'reasoning':
        emitEvent(params.onStream, {
          type: 'reasoning',
          delta: (part as any).textDelta || '',
          timestamp: new Date(),
        })
        break

      case 'text-delta':
        const delta = part.textDelta || ''
        fullText += delta
        emitEvent(params.onStream, {
          type: 'assistant',
          delta: delta,
          timestamp: new Date(),
        })
        break

      case 'tool-call':
        emitEvent(params.onStream, {
          type: 'tool',
          status: 'running',
          tool: part.toolName,
          input: part.args,
          timestamp: new Date(),
        })
        break

      case 'tool-result':
        const tc: ToolCall = {
          tool: part.toolName,
          input: part.args,
          output: part.result,
          status: 'completed',
          timestamp: new Date(),
        }
        toolCalls.push(tc)
        emitEvent(params.onStream, {
          type: 'tool',
          status: 'completed',
          tool: part.toolName,
          input: part.args,
          output: part.result,
          timestamp: new Date(),
        })
        break

      case 'error':
        emitEvent(params.onStream, {
          type: 'error',
          error: String(part.error),
          timestamp: new Date(),
        })
        break
    }
  }

  // Parse output from final text
  const output = parseOutput(fullText)

  return {
    output,
    toolCalls,
    tokensUsed,
  }
}

/**
 * Load enabled tools for an agent
 */
async function loadEnabledTools(
  agentId: string,
  toolConfig: Record<string, any>
): Promise<any[]> {
  const supabase = await createClient()

  // Get enabled tools from database
  const { data: agentTools } = await supabase
    .from('agent_tools')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_enabled', true)

  const enabledToolNames = agentTools?.map((t) => t.tool_name) || []

  // Load tools from registry
  const tools = enabledToolNames
    .map((name) => {
      const tool = toolRegistry.get(name)
      if (!tool) return null

      // Convert to AI SDK format
      return {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema || {},
        execute: tool.execute,
      }
    })
    .filter(Boolean)

  return tools
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(
  config: AgentExecutionConfig,
  input: Record<string, unknown>
): string {
  let prompt = config.instructionPrompt

  // Inject execution context
  if (Object.keys(config.executionContext).length > 0) {
    prompt += '\n\n## Context\n'
    for (const [key, value] of Object.entries(config.executionContext)) {
      prompt += `- ${key}: ${JSON.stringify(value)}\n`
    }
  }

  // Add output format instruction
  prompt += '\n\n## Output Format\n'
  prompt += 'Always return your final result as a JSON object wrapped in ```json code blocks.\n'
  prompt += 'Example:\n```json\n{"result": "your result here"}\n```'

  return prompt
}

/**
 * Format user input as a message
 */
function formatUserInput(input: Record<string, unknown>): string {
  if (Object.keys(input).length === 1 && 'message' in input) {
    return String(input.message)
  }

  return `Execute with the following input:\n${JSON.stringify(input, null, 2)}`
}

/**
 * Parse output from AI response
 */
function parseOutput(text: string): Record<string, unknown> {
  // Try to extract JSON from code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch (e) {
      // Fall through
    }
  }

  // Try to parse the entire text as JSON
  try {
    return JSON.parse(text)
  } catch (e) {
    // Return as plain text
    return { result: text }
  }
}

/**
 * Generate default prompt if none exists
 */
function generateDefaultPrompt(agent: any): string {
  return `You are ${agent.name}, an AI agent designed to ${agent.description || 'help users accomplish their goals'}.

Follow the user's instructions carefully and use the available tools to complete the task.

Always explain what you're doing and provide clear, structured output.`
}

/**
 * Emit event to stream callback
 */
function emitEvent(callback: StreamCallback | undefined, event: ExecutionEvent) {
  if (callback) {
    callback(event)
  }
}
