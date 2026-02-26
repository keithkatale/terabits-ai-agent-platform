// Helpers for the dashboard "Personal Assistant" chat (singular chat + execution logs persistence).
// Uses a per-user "Personal Assistant" agent so messages and execution_logs satisfy RLS (agent_id required).

import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSlug } from '@/lib/agent-slug'

export const PERSONAL_ASSISTANT_NAME = 'Personal Assistant'

/**
 * Get or create the Personal Assistant agent for the given user.
 * Used to attach messages and execution_logs to a valid agent for RLS.
 * Uses the admin client so this works when the user is authenticated via Auth.js (e.g. Google)
 * and the cookie-based Supabase session has no auth.uid(), which would otherwise block the insert.
 */
export async function getOrCreatePersonalAssistantAgent(userId: string): Promise<string> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for Personal Assistant')
  }

  const { data: existing } = await admin
    .from('agents')
    .select('id')
    .eq('user_id', userId)
    .eq('name', PERSONAL_ASSISTANT_NAME)
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  const slug = generateAgentSlug()
  const { data: created, error } = await admin
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
