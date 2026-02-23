/**
 * POST /api/integrations/gmail/disconnect
 * Removes the user's Gmail integration (OAuth tokens).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error: deleteError } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
