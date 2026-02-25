/**
 * Auth.js (NextAuth v5) — Google sign-in for the site.
 * Session stores supabase_user_id so existing API routes (credits, workflows, etc.) keep working.
 */

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { createAdminClient } from '@/lib/supabase/admin'
import type { JWT } from 'next-auth/jwt'

async function ensureSupabaseUserByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient()
  if (!admin) return null
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(), // user signs in with Google only
  })
  if (created?.user?.id) return created.user.id
  if (error?.message?.includes('already been registered') || error?.message?.includes('already exists')) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const user = list?.users?.find((u) => u.email === email)
    return user?.id ?? null
  }
  return null
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const supabaseUserId = await ensureSupabaseUserByEmail(profile.email as string)
        if (supabaseUserId) token.supabase_user_id = supabaseUserId
      }
      return token
    },
    async session({ session, token }) {
      const t = token as JWT & { supabase_user_id?: string }
      if (t.supabase_user_id && session?.user)
        (session.user as { supabase_user_id?: string }).supabase_user_id = t.supabase_user_id
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  trustHost: true,
})
