// Agent Builder API
// Architecture: one tool — saveInstructions — writes the executor agent's full config to the DB.
// The builder AI converses with the user, understands what they need, then calls saveInstructions once.
// No canvas, no plan approval flow, no phases. Simple and reliable.

import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getBuilderSystemPrompt } from '@/lib/orchestrator/system-prompt'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, agentId, agentName, agentCategory } = body

    if (!messages || !Array.isArray(messages) || !agentId) {
      return new Response(JSON.stringify({ error: 'messages and agentId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = await createClient()

    // Convert UI messages to model messages, preserving tool call history
    let convertedMessages: any[]
    try {
      convertedMessages = await convertToModelMessages(messages)
    } catch {
      convertedMessages = messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.parts
          ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
          : m.content ?? '',
      }))
    }

    // Load any existing instructions so the AI knows what's already been saved
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('instruction_prompt, execution_context, name, description, category, status')
      .eq('id', agentId)
      .single()

    const systemPrompt = getBuilderSystemPrompt(
      agentName ?? existingAgent?.name ?? 'New Agent',
      agentCategory ?? existingAgent?.category ?? 'general',
      existingAgent?.instruction_prompt ?? null,
    )

    const tools = {
      saveInstructions: tool({
        description:
          'Save the complete agent instructions to the database. Call this once you understand what the user needs. This makes the agent runnable.',
        inputSchema: z.object({
          agentName: z.string().describe('Clear, descriptive name for this agent'),
          description: z.string().describe('One sentence — what this agent does'),
          category: z
            .enum([
              'customer_support',
              'content_creation',
              'data_analysis',
              'task_automation',
              'personal_assistant',
              'research_agent',
              'general',
            ])
            .describe('Best-fit category'),
          instructionPrompt: z
            .string()
            .describe(
              'The full system prompt for the executor AI — detailed, 3+ paragraphs covering behaviour, inputs, outputs, and edge cases',
            ),
          inputFields: z
            .array(
              z.object({
                name: z.string().describe('Field key, e.g. "topic"'),
                label: z.string().describe('Human-readable label, e.g. "Topic"'),
                type: z.enum(['text', 'number', 'url', 'textarea']),
                placeholder: z.string().optional(),
                required: z.boolean().optional(),
              }),
            )
            .describe('Input fields the user fills before running the agent'),
        }),
        execute: async ({ agentName: name, description, category, instructionPrompt, inputFields }) => {
          const toolConfig = {
            web_search: { enabled: true },
            web_scrape: { enabled: true },
            ai_extract: { enabled: true },
            ai_summarize: { enabled: true },
            ai_image_generate: { enabled: true },
            http_request: { enabled: true },
            rss_reader: { enabled: true },
          }

          const executionContext = {
            agentType: category,
            capabilities: description,
            triggerConfig: {
              inputFields: inputFields ?? [],
              buttonLabel: `Run ${name}`,
            },
          }

          const { error } = await supabase
            .from('agents')
            .update({
              name,
              description,
              category,
              instruction_prompt: instructionPrompt,
              tool_config: toolConfig,
              execution_context: executionContext,
              status: 'ready',
              conversation_phase: 'complete',
              updated_at: new Date().toISOString(),
            })
            .eq('id', agentId)

          if (error) {
            console.error('saveInstructions DB error:', error)
            return { success: false, error: error.message }
          }

          return {
            success: true,
            __agentUpdate: {
              name,
              description,
              category,
              instruction_prompt: instructionPrompt,
              execution_context: executionContext,
              tool_config: toolConfig,
              status: 'ready',
              conversation_phase: 'complete',
            },
            summary: {
              agentName: name,
              description,
              inputFieldCount: inputFields?.length ?? 0,
              instructionLength: instructionPrompt.length,
            },
          }
        },
      }),
    }

    const result = streamText({
      model: google('gemini-3-pro-preview'),
      system: systemPrompt,
      messages: convertedMessages,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(5),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: -1,
            includeThoughts: true,
          },
        },
      },
    })

    return result.toUIMessageStreamResponse({ sendReasoning: true })
  } catch (error) {
    console.error('Agent builder API error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
