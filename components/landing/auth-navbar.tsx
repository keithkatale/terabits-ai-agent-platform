'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AuthNavbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch (error) {
        console.error('Error checking auth:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [supabase.auth])

  // Show nothing while loading to prevent layout shift
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 h-10" />
    )
  }

  if (isAuthenticated) {
    return (
      <Link href="/dashboard">
        <Button size="sm">Dashboard</Button>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/auth/login">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          Sign in
        </Button>
      </Link>
      <Link href="/auth/sign-up">
        <Button size="sm">Sign up</Button>
      </Link>
    </div>
  )
}
