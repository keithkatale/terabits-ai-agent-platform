'use client'

/**
 * CredentialForm — appears inline in the chat when the AI calls request_credentials.
 *
 * Inspired by the EnvironmentVariables component pattern:
 *  - Fields are listed with lock icons for password types
 *  - Values are masked by default; user can toggle visibility per field
 *  - "Submit to browser" sends values directly to /api/browser/session/:id/smart-fill
 *  - AI never sees the values; it only receives the post-submission screenshot
 *
 * After submission this component shows the result screenshot and calls
 * onComplete(screenshotBase64, url) so the parent can resume the AI with context.
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CredentialField {
  name: string
  label: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  required?: boolean
  locatorLabel?: string
  locatorPlaceholder?: string
  locatorSelector?: string
}

export interface CredentialFormProps {
  platform: string
  sessionId: string
  fields: CredentialField[]
  submitLabel?: string
  submitSelector?: string
  note?: string
  /** Called when credentials are submitted and the browser returns a result */
  onComplete: (result: { screenshotBase64: string | null; url: string; success: boolean }) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CredentialForm({
  platform,
  sessionId,
  fields,
  submitLabel = 'Sign in',
  submitSelector,
  note,
  onComplete,
  className,
}: CredentialFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, '']))
  )
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  const isSubmitting = status === 'submitting'
  const isDone = status === 'success' || status === 'error'

  const toggleVisible = (name: string) =>
    setVisible((v) => ({ ...v, [name]: !v[name] }))

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError(null)

    // Build the smart-fill payload
    const fillFields = fields.map((f) => ({
      label: f.locatorLabel ?? f.label,
      placeholder: f.locatorPlaceholder ?? f.placeholder,
      selector: f.locatorSelector,
      value: values[f.name] ?? '',
      type: f.type,
    }))

    try {
      // Get a proxy token first (fast path)
      let token: string | null = null
      try {
        const tr = await fetch('/api/browser/token', { method: 'POST' })
        if (tr.ok) token = ((await tr.json()) as { token?: string }).token ?? null
      } catch { /* proceed without token — falls back to Supabase auth */ }

      const resp = await fetch(`/api/browser/session/${sessionId}/smart-fill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-browser-token': token } : {}),
        },
        body: JSON.stringify({
          fields: fillFields,
          submitLabel,
          submitSelector,
          waitAfterMs: 4000,
        }),
      })

      const data = await resp.json() as {
        success: boolean
        screenshotBase64?: string | null
        url?: string
        error?: string
      }

      if (!resp.ok || !data.success) {
        setStatus('error')
        setError(data.error ?? `Server error ${resp.status}`)
        onComplete({ screenshotBase64: data.screenshotBase64 ?? null, url: data.url ?? '', success: false })
        return
      }

      setStatus('success')
      setResultUrl(data.url ?? null)
      // Clear sensitive values from state
      setValues(Object.fromEntries(fields.map((f) => [f.name, ''])))
      onComplete({ screenshotBase64: data.screenshotBase64 ?? null, url: data.url ?? '', success: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus('error')
      setError(msg)
      onComplete({ screenshotBase64: null, url: '', success: false })
    }
  }, [fields, values, sessionId, submitLabel, submitSelector, onComplete])

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm overflow-hidden w-full max-w-md',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Sign in to {platform}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Your credentials go directly to the browser — the AI never sees them
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 border-green-400/40 text-green-700">
          <ShieldCheck className="h-3 w-3" />
          Secure
        </Badge>
      </div>

      {/* Fields */}
      {!isDone && (
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          {note && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              {note}
            </p>
          )}

          {fields.map((field) => {
            const isPassword = field.type === 'password'
            const show = visible[field.name] ?? false
            const inputType = isPassword ? (show ? 'text' : 'password') : (field.type ?? 'text')

            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={`cred-${field.name}`} className="text-xs font-medium flex items-center gap-1.5">
                  {isPassword && <Lock className="h-3 w-3 text-muted-foreground" />}
                  {field.label}
                  {field.required !== false && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id={`cred-${field.name}`}
                    type={inputType}
                    value={values[field.name] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    placeholder={field.placeholder ?? (isPassword ? '••••••••' : field.label)}
                    autoComplete={isPassword ? 'current-password' : field.type === 'email' ? 'email' : 'username'}
                    required={field.required !== false}
                    disabled={isSubmitting}
                    className={cn('h-9 text-sm pr-9', isPassword && 'font-mono tracking-wider')}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleVisible(field.name)}
                      tabIndex={-1}
                    >
                      {show
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <Button
            type="submit"
            className="w-full h-9 text-sm gap-2 mt-1"
            disabled={isSubmitting || fields.some((f) => f.required !== false && !values[f.name])}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5" />
                Submit to browser
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Values are sent directly to the browser and immediately cleared from memory.
          </p>
        </form>
      )}

      {/* Result states */}
      {status === 'success' && (
        <div className="px-4 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Credentials submitted</p>
            {resultUrl && (
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">{resultUrl}</p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to submit</p>
              {error && <p className="text-xs text-muted-foreground">{error}</p>}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={() => setStatus('idle')}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
