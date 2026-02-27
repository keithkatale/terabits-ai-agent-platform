import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'

/**
 * Read Supabase config inside the middleware (edge runtime).
 *
 * In edge runtime ALL process.env references are replaced at build time.
 * If the Docker image wasn't built with --build-arg NEXT_PUBLIC_SUPABASE_URL
 * etc., these will be undefined and there's nothing we can do at runtime.
 * We return null so the middleware can degrade gracefully instead of crashing
 * every request with a 500.
 */
function getEdgeSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Allow dashboard if signed in with Google (Auth.js)
  const session = await auth()
  if (session?.user && (session.user as { supabase_user_id?: string }).supabase_user_id) {
    return supabaseResponse
  }

  const env = getEdgeSupabaseEnv()
  if (!env) {
    // Supabase env vars were not available at build time (edge runtime inlines
    // them). Session refresh is impossible, but we let the request through
    // so the app can still render pages and show its own error/login UI.
    // Protected routes will be caught by server-side auth checks.
    console.error(
      'Middleware: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        'are undefined. Rebuild the Docker image with --build-arg to fix. ' +
        'Skipping Supabase session refresh.'
    )
    return supabaseResponse
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to login only for dashboard
  // Allow access to /agent/* for unauthenticated users (guest agents)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    const returnTo = request.nextUrl.pathname
    url.pathname = '/auth/login'
    url.searchParams.set('redirect_to', returnTo)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
