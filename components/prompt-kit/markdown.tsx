'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  children: string
  className?: string
  id?: string
}

// Simple markdown renderer for chat messages -- no heavy dependencies
// Handles: **bold**, *italic*, `code`, ```code blocks```, - lists, ## headings, [links](url)
function parseMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/\n\n+/)
  const result: React.ReactNode[] = []

  blocks.forEach((block, blockIndex) => {
    const trimmed = block.trim()
    if (!trimmed) return

    // Code blocks
    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n')
      const lang = lines[0].replace('```', '').trim()
      const code = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n')
      result.push(
        <div key={blockIndex} className="my-2 rounded-lg border border-border bg-muted/50 overflow-hidden">
          {lang && (
            <div className="border-b border-border bg-muted px-3 py-1">
              <span className="text-[10px] font-mono text-muted-foreground">{lang}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-3">
            <code className="text-[12px] leading-relaxed font-mono text-foreground">{code}</code>
          </pre>
        </div>
      )
      return
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      result.push(
        <h3 key={blockIndex} className="mt-4 mb-1.5 text-sm font-semibold text-foreground">
          {formatInline(trimmed.slice(4))}
        </h3>
      )
      return
    }
    if (trimmed.startsWith('## ')) {
      result.push(
        <h2 key={blockIndex} className="mt-4 mb-1.5 text-sm font-semibold text-foreground">
          {formatInline(trimmed.slice(3))}
        </h2>
      )
      return
    }
    if (trimmed.startsWith('# ')) {
      result.push(
        <h1 key={blockIndex} className="mt-4 mb-2 text-base font-bold text-foreground">
          {formatInline(trimmed.slice(2))}
        </h1>
      )
      return
    }

    // Lists (unordered)
    if (/^[-*]\s/.test(trimmed)) {
      const items = trimmed.split('\n').filter((l) => /^[-*]\s/.test(l.trim()))
      result.push(
        <ul key={blockIndex} className="my-1.5 space-y-1 pl-4">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-foreground list-disc">
              {formatInline(item.replace(/^[-*]\s+/, ''))}
            </li>
          ))}
        </ul>
      )
      return
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split('\n').filter((l) => /^\d+\.\s/.test(l.trim()))
      result.push(
        <ol key={blockIndex} className="my-1.5 space-y-1 pl-4">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-foreground list-decimal">
              {formatInline(item.replace(/^\d+\.\s+/, ''))}
            </li>
          ))}
        </ol>
      )
      return
    }

    // Regular paragraphs
    result.push(
      <p key={blockIndex} className="text-sm leading-relaxed text-foreground">
        {formatInline(trimmed)}
      </p>
    )
  })

  return result
}

// Inline formatting: **bold**, *italic*, `code`, [text](url)
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Italic *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    // Inline code `text`
    const codeMatch = remaining.match(/`([^`]+)`/)
    // Link [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

    // Find earliest match
    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch } : null,
      italicMatch ? { type: 'italic', match: italicMatch } : null,
      codeMatch ? { type: 'code', match: codeMatch } : null,
      linkMatch ? { type: 'link', match: linkMatch } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => (a!.match.index ?? 0) - (b!.match.index ?? 0))

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    const first = matches[0]!
    const idx = first.match.index ?? 0

    if (idx > 0) {
      parts.push(remaining.slice(0, idx))
    }

    if (first.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold">
          {first.match[1]}
        </strong>
      )
    } else if (first.type === 'italic') {
      parts.push(
        <em key={key++} className="italic">
          {first.match[1]}
        </em>
      )
    } else if (first.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-muted px-1.5 py-0.5 text-[12px] font-mono text-foreground"
        >
          {first.match[1]}
        </code>
      )
    } else if (first.type === 'link') {
      parts.push(
        <a
          key={key++}
          href={first.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
        >
          {first.match[1]}
        </a>
      )
    }

    remaining = remaining.slice(idx + first.match[0].length)
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

export const Markdown = memo(function Markdown({
  children,
  className,
  id,
}: MarkdownProps) {
  const rendered = useMemo(() => parseMarkdown(children), [children])

  return (
    <div className={cn('space-y-2', className)} data-message-id={id}>
      {rendered}
    </div>
  )
})
