'use client'

import { cn } from '@/lib/utils'

interface TextShimmerProps {
  children: React.ReactNode
  as?: React.ElementType
  duration?: number
  spread?: number
  className?: string
}

export function TextShimmer({
  children,
  as: Component = 'span',
  duration = 4,
  spread = 20,
  className,
}: TextShimmerProps) {
  return (
    <Component
      className={cn(
        'inline-flex animate-text-shimmer bg-[length:250%_100%] bg-clip-text text-transparent',
        'bg-[linear-gradient(90deg,var(--color-muted-foreground)_40%,var(--color-primary)_50%,var(--color-muted-foreground)_60%)]',
        className
      )}
      style={{
        animationDuration: `${duration}s`,
        // Spread is handled via the gradient percentages
      }}
    >
      {children}
    </Component>
  )
}
