'use client'

import React, { useRef, useEffect, forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'

export interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Conversation({ className, children, ...props }: ConversationProps) {
  return (
    <div className={cn('flex flex-col h-full', className)} {...props}>
      {children}
    </div>
  )
}

export const ConversationContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ConversationContent({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto min-h-0', className)}
      {...props}
    >
      {children}
    </div>
  )
})

export function ConversationScrollButton({
  className,
  scrollTargetRef,
  ...props
}: React.ComponentProps<typeof Button> & {
  scrollTargetRef?: React.RefObject<HTMLElement | null>
}) {
  const [show, setShow] = React.useState(false)
  const targetRef = scrollTargetRef ?? useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target = targetRef.current
    if (!target) return
    const check = () => {
      const atBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 80
      setShow(!atBottom)
    }
    target.addEventListener('scroll', check)
    check()
    return () => target.removeEventListener('scroll', check)
  }, [targetRef])
  return show ? (
    <Button
      size="icon"
      variant="secondary"
      className={cn('rounded-full shadow-lg', className)}
      onClick={() => {
        const t = targetRef.current
        if (t) t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' })
      }}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  ) : null
}

export interface ConversationEmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

export function ConversationEmptyState({
  title = 'No messages yet',
  description = 'Start a conversation to see messages here',
  icon,
  children,
  className,
}: ConversationEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center flex-1 py-12 px-4 text-center',
        className
      )}
    >
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      {children}
    </div>
  )
}
