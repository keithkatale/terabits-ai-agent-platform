'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewChatPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'creating' | 'done' | 'error'>('creating')

  useEffect(() => {
    let cancelled = false
    async function createAndRedirect() {
      try {
        const res = await fetch('/api/desktops', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data?.id) {
          setStatus('done')
          router.replace(`/chat/${data.id}`)
        } else {
          setStatus('error')
          router.replace('/chat')
        }
      } catch {
        if (!cancelled) {
          setStatus('error')
          router.replace('/chat')
        }
      }
    }
    createAndRedirect()
    return () => { cancelled = true }
  }, [router])

  if (status === 'error') return null
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Creating new desktop…
    </div>
  )
}
