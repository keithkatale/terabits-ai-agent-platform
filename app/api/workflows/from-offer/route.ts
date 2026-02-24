import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorkflowSlug } from '@/lib/workflow-slug'

const DEFAULT_TOOL_CONFIG = {
  web_search: { enabled: true },
  web_scrape: { enabled: true },
  ai_process: { enabled: true },
  read: { enabled: true },
  write: { enabled: false },
}

/**
 * POST: Create a workflow from "Save this workflow?" offer (chat).
 * Body: { suggestedName, description, instructionPrompt, inputFields }
 * Returns: { workflow: { id, slug, name, ... } } for redirect to /workflow/[slug]
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
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

    const slug = generateWorkflowSlug()
    const executionContext = {
      triggerConfig: {
        inputFields: Array.isArray(inputFields) ? inputFields : [],
        buttonLabel: `Run ${suggestedName.trim()}`,
      },
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        slug,
        user_id: user.id,
        name: suggestedName.trim(),
        description: (description ?? suggestedName).trim().slice(0, 500),
        instruction_prompt: instructionPrompt.trim(),
        tool_config: DEFAULT_TOOL_CONFIG,
        execution_context: executionContext,
        status: 'ready',
      })
      .select('id, slug, name, description')
      .single()

    if (error) {
      if (error.code === '23505') {
        const retrySlug = generateWorkflowSlug()
        const { data: retry, error: retryError } = await supabase
          .from('workflows')
          .insert({
            slug: retrySlug,
            user_id: user.id,
            name: suggestedName.trim(),
            description: (description ?? suggestedName).trim().slice(0, 500),
            instruction_prompt: instructionPrompt.trim(),
            tool_config: DEFAULT_TOOL_CONFIG,
            execution_context: executionContext,
            status: 'ready',
          })
          .select('id, slug, name, description')
          .single()
        if (retryError) {
          console.error('workflows/from-offer retry:', retryError.message)
          return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
        }
        return NextResponse.json({ workflow: retry })
      }
      console.error('workflows/from-offer:', error.message)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }

    return NextResponse.json({ workflow })
  } catch (e) {
    console.error('workflows/from-offer:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
