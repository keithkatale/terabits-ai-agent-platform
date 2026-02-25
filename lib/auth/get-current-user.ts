/**
 * Single place to get the current user id for API routes.
 * Supports both Supabase (email/password) and Auth.js (Google sign-in).
 */

import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  const supabaseUserId = (session?.user as { supabase_user_id?: string } | undefined)?.supabase_user_id
  if (supabaseUserId) return supabaseUserId
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getCurrentUser(): Promise<{ id: string; email?: string } | null> {
  const session = await auth()
  const supabaseUserId = (session?.user as { supabase_user_id?: string } | undefined)?.supabase_user_id
  if (supabaseUserId) {
    return { id: supabaseUserId, email: session?.user?.email ?? undefined }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email ?? undefined }
}
