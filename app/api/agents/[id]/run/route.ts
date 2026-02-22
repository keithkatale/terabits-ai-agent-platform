import { streamText, convertToModelMessages } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normalizeUsage } from '@/lib/ai/usage'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { messages, sessionId } = body

  const supabase = await createClient()

  // Fetch the agent -- use service role if public, otherwise RLS
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.is_deployed) {
    return NextResponse.json({ error: 'Agent is not deployed' }, { status: 403 })
  }

  if (!agent.system_prompt) {
    return NextResponse.json({ error: 'Agent has no system prompt' }, { status: 400 })
  }

  // Fetch skills to inject as context
  const { data: skills } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('agent_id', id)
    .eq('is_active', true)

  // Build the enriched system prompt
  let systemPrompt = agent.system_prompt

  if (skills && skills.length > 0) {
    systemPrompt += '\n\n## Your Skills\n'
    for (const skill of skills) {
      systemPrompt += `\n### ${skill.name}\n${skill.description || ''}\n`
      if (skill.skill_content) {
        systemPrompt += `Instructions: ${skill.skill_content}\n`
      }
    }
  }

  // Log execution start
  const { data: log } = await supabase.from('execution_logs').insert({
    agent_id: id,
    session_id: sessionId || null,
    status: 'running',
    input: { message_count: messages.length },
    started_at: new Date().toISOString(),
  }).select().single()

  const modelName = agent.model || 'gemini-3-flash-preview'
  const result = streamText({
    model: google(modelName),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 4096,
    onFinish: async ({ text, totalUsage: rawUsage }) => {
      // Update the execution log with status, output, and token usage
      if (log) {
        const usage = normalizeUsage(rawUsage as { inputTokens?: number; outputTokens?: number; totalTokens?: number })
        await supabase
          .from('execution_logs')
          .update({
            status: 'completed',
            output: { response_length: text?.length ?? 0 },
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            total_tokens: usage.totalTokens,
            credits_used: 0, // This path does not deduct credits; use execute route for that
            completed_at: new Date().toISOString(),
          })
          .eq('id', log.id)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
