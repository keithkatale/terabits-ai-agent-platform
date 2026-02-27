/**
 * Centralized Supabase env check. The app expects exactly these variable names.
 * Use in server and middleware so missing config fails with a clear message.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(Boolean)
    throw new Error(
      `Supabase client requires env vars: ${missing.join(', ')}. ` +
        `Set them in Cloud Run (Variables & Secrets) with these exact names. ` +
        `Get values from Supabase Dashboard → Project Settings → API.`
    )
  }
  return { url, anonKey }
}
