'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowUp, Loader2 } from 'lucide-react'

export type PromptInputMessage = {
  text?: string
  files?: File[]
}

export type ChatStatus = 'ready' | 'streaming' | 'submitted' | 'error'

export interface PromptInputProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit: (message: PromptInputMessage, event: React.FormEvent<HTMLFormElement>) => void
}

const PromptInput = React.forwardRef<HTMLFormElement, PromptInputProps>(
  ({ onSubmit, className, children, ...props }, ref) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const textarea = form.querySelector('textarea')
      const text = textarea?.value?.trim() ?? ''
      onSubmit({ text }, e)
    }

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn('flex flex-col', className)}
        {...props}
      >
        {children}
      </form>
    )
  }
)
PromptInput.displayName = 'PromptInput'

function PromptInputBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="prompt-input-body" className={cn('flex min-h-0 flex-1', className)} {...props} />
}

const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea>
>(({ className, onKeyDown, ...props }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
    onKeyDown?.(e)
  }

  return (
    <Textarea
      ref={ref}
      data-slot="prompt-input-textarea"
      rows={1}
      className={cn(
        'min-h-[44px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0',
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
})
PromptInputTextarea.displayName = 'PromptInputTextarea'

function PromptInputFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="prompt-input-footer"
      className={cn('flex items-center gap-2 border-t border-border/50 px-2 py-2', className)}
      {...props}
    />
  )
}

function PromptInputTools({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="prompt-input-tools" className={cn('flex flex-1 items-center gap-1', className)} {...props} />
}

export interface PromptInputSubmitProps extends React.ComponentProps<typeof Button> {
  status?: ChatStatus
}

function PromptInputSubmit({ status = 'ready', disabled, className, ...props }: PromptInputSubmitProps) {
  const isStreaming = status === 'streaming' || status === 'submitted'

  return (
    <Button
      type="submit"
      size="icon"
      disabled={disabled || isStreaming}
      className={cn('h-8 w-8 shrink-0 rounded-lg', className)}
      {...props}
    >
      {isStreaming ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <ArrowUp className="h-4 w-4" aria-hidden />
      )}
      <span className="sr-only">Send</span>
    </Button>
  )
}

export {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
}
