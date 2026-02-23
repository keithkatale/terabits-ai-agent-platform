/**
 * GET /api/integrations/gmail/status
 * Returns whether the current user has Gmail connected.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ connected: false })
  }
  const { data } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .maybeSingle()
  return NextResponse.json({ connected: !!data })
}
