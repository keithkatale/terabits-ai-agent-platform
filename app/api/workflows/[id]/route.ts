import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET: Fetch one workflow by id or slug (w_xxx) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bySlug = id.startsWith('w_')
  const { data: workflow, error } = await supabase
    .from('workflows')
    .select('*')
    .eq(bySlug ? 'slug' : 'id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json(workflow)
}
