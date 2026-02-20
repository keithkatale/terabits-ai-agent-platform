import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NewAgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Create a new agent in draft state with timestamp-based temporary name
  const timestamp = new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      user_id: user.id,
      name: `New Agent (${timestamp})`,
      category: 'general',
      status: 'draft',
      model: 'gemini-3-flash-preview',
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
