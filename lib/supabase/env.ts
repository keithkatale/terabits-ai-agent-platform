/**
 * Centralized Supabase env check.
 *
 * NEXT_PUBLIC_* vars are inlined at build time by Next.js -- they won't be
 * available at runtime if the Docker image wasn't built with --build-arg.
 * As a safety net we also check the non-prefixed SUPABASE_URL / SUPABASE_ANON_KEY
 * which ARE readable from process.env at runtime in Node.js (server components,
 * API routes). This fallback does NOT help in edge runtime (middleware) because
 * edge also inlines all process.env references at build time.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url =
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '')
      .trim() || undefined
  const anonKey =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '')
      .trim() || undefined

  if (!url || !anonKey) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(Boolean)
    throw new Error(
      `Supabase client requires env vars: ${missing.join(', ')}. ` +
        `If deploying to Cloud Run, pass them as --build-arg during docker build ` +
        `(NEXT_PUBLIC_* are inlined at build time by Next.js). ` +
        `Also set them in Cloud Run Variables & Secrets for API routes. ` +
        `Get values from Supabase Dashboard → Project Settings → API.`
    )
  }
  return { url, anonKey }
}
