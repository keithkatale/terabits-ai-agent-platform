import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NewAgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Create a new agent in draft state
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      user_id: user.id,
      name: 'New AI Employee',
      category: 'general',
      status: 'draft',
      model: 'gemini-2.5-flash-preview',
      conversation_phase: 'discovery',
    })
    .select()
    .single()

  if (error || !agent) {
    redirect('/dashboard')
  }

  // Redirect to the agent builder
  redirect(`/agent/${agent.id}`)
}
