import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET: List workflows for the current user */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('id, slug, name, description, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('GET /api/workflows:', error.message)
    return NextResponse.json({ error: 'Failed to list workflows' }, { status: 500 })
  }

  return NextResponse.json({ workflows: workflows ?? [] })
}
