import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAgentSlug } from '@/lib/agent-slug'

const DEFAULT_TOOL_CONFIG = {
  web_search: { enabled: true },
  web_scrape: { enabled: true },
  ai_process: { enabled: true },
  read: { enabled: true },
  write: { enabled: false },
}

/**
 * POST: Create a new agent from a "Save this workflow?" offer (main assistant chat).
 * Body: { suggestedName, description, instructionPrompt, inputFields }
 * Returns: { agent: { id, slug, name, ... } } for redirect to /agent/[slug]
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      suggestedName,
      description,
      instructionPrompt,
      inputFields,
    } = body as {
      suggestedName?: string
      description?: string
      instructionPrompt?: string
      inputFields?: Array<{
        name: string
        label: string
        type: 'text' | 'number' | 'url' | 'textarea'
        placeholder?: string
        required?: boolean
      }>
    }

    if (!suggestedName?.trim() || !instructionPrompt?.trim()) {
      return NextResponse.json(
        { error: 'suggestedName and instructionPrompt are required' },
        { status: 400 },
      )
    }

    const slug = generateAgentSlug()
    const executionContext = {
      agentType: 'task_automation',
      capabilities: description?.trim() ?? suggestedName,
      triggerConfig: {
        inputFields: Array.isArray(inputFields) ? inputFields : [],
        buttonLabel: `Run ${suggestedName.trim()}`,
      },
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        slug,
        user_id: user.id,
        name: suggestedName.trim(),
        description: (description ?? suggestedName).trim().slice(0, 500),
        category: 'task_automation',
        status: 'ready',
        model: 'gemini-2.5-flash',
        conversation_phase: 'complete',
        instruction_prompt: instructionPrompt.trim(),
        tool_config: DEFAULT_TOOL_CONFIG,
        execution_context: executionContext,
      })
      .select('id, slug, name, description')
      .single()

    if (error) {
      if (error.code === '23505') {
        const retrySlug = generateAgentSlug()
        const { data: retryAgent, error: retryError } = await supabase
          .from('agents')
          .insert({
            slug: retrySlug,
            user_id: user.id,
            name: suggestedName.trim(),
            description: (description ?? suggestedName).trim().slice(0, 500),
            category: 'task_automation',
            status: 'ready',
            model: 'gemini-2.5-flash',
            conversation_phase: 'complete',
            instruction_prompt: instructionPrompt.trim(),
            tool_config: DEFAULT_TOOL_CONFIG,
            execution_context: executionContext,
          })
          .select('id, slug, name, description')
          .single()
        if (retryError) {
          console.error('from-workflow retry error:', retryError.message)
          return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
        }
        return NextResponse.json({ agent: retryAgent })
      }
      console.error('from-workflow error:', error.message)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({ agent })
  } catch (e) {
    console.error('from-workflow:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
