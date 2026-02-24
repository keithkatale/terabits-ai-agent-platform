// Helpers for the dashboard "Personal Assistant" chat (singular chat + execution logs persistence).
// Uses a per-user "Personal Assistant" agent so messages and execution_logs satisfy RLS (agent_id required).

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAgentSlug } from '@/lib/agent-slug'

export const PERSONAL_ASSISTANT_NAME = 'Personal Assistant'

/**
 * Get or create the Personal Assistant agent for the given user.
 * Used to attach messages and execution_logs to a valid agent for RLS.
 */
export async function getOrCreatePersonalAssistantAgent(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', userId)
    .eq('name', PERSONAL_ASSISTANT_NAME)
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  const slug = generateAgentSlug()
  const { data: created, error } = await supabase
    .from('agents')
    .insert({
      slug,
      user_id: userId,
      name: PERSONAL_ASSISTANT_NAME,
      description: 'Platform assistant for dashboard chat',
      category: 'personal_assistant',
      status: 'ready',
      instruction_prompt: 'You are the user\'s AI assistant.',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create Personal Assistant agent: ${error.message}`)
  return created!.id
}
