'use client'

import { memo, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { marked } from 'marked'
import { Download, Link2, Check } from 'lucide-react'

export interface MarkdownProps {
  children: string
  className?: string
  id?: string
}

// Split markdown into blocks so unchanged blocks can be memoized during streaming
function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return ''
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : ''
}

// ── Exportable table wrapper ───────────────────────────────────────────────────

function ExportableTable({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const extractData = (): string[][] => {
    const table = wrapperRef.current?.querySelector('table')
    if (!table) return []
    return Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) =>
        (cell as HTMLElement).innerText.trim()
      )
    )
  }

  const extractHeading = (): string | null => {
    let el = outerRef.current?.previousElementSibling
    while (el) {
      if (/^h[1-4]$/i.test(el.tagName)) return el.textContent?.trim() ?? null
      if (el.tagName === 'TABLE' || el.querySelector('table')) break
      el = el.previousElementSibling
    }
    return null
  }

  const downloadCSV = () => {
    const data = extractData()
    if (!data.length) return
    const csv = data
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'table.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadXLSX = async () => {
    const data = extractData()
    if (!data.length) return
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, 'table.xlsx')
  }

  const shareTable = async () => {
    const data = extractData()
    if (!data.length) return
    const heading = extractHeading()
    const payload = JSON.stringify({ heading, data })
    const bytes = new TextEncoder().encode(payload)
    const binary = String.fromCharCode(...bytes)
    const encoded = btoa(binary)
    const url = `${window.location.origin}/share/table?d=${encoded}`
    await navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }

  return (
    <div ref={outerRef} className="group relative my-4">
      <div
        data-no-print
        className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <button
          onClick={downloadCSV}
          title="Download as CSV"
          className="flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <Download className="h-2.5 w-2.5" />
          CSV
        </button>
        <button
          onClick={downloadXLSX}
          title="Download as Excel"
          className="flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <Download className="h-2.5 w-2.5" />
          XLSX
        </button>
        <button
          onClick={shareTable}
          title="Copy shareable link to this table"
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur-sm transition-colors ${shareCopied ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-border bg-background/90 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {shareCopied ? <Check className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
          {shareCopied ? 'Copied!' : 'Share'}
        </button>
      </div>
      <div ref={wrapperRef} className="markdown-table-wrapper overflow-x-auto rounded-lg border border-border">
        <table className="min-w-max w-full border-collapse text-sm table-auto">{children}</table>
      </div>
    </div>
  )
}

const components: Partial<Components> = {
  pre: ({ children }) => <>{children}</>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, children, node, ...props }: any) => {
    const isInline =
      !node?.position?.start.line ||
      node?.position?.start.line === node?.position?.end.line
    if (isInline) {
      return (
        <code
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground"
          {...props}
        >
          {children}
        </code>
      )
    }
    const lang = extractLanguage(className)
    return (
      <div className="my-3 overflow-hidden rounded-lg border border-border bg-muted/50">
        {lang && (
          <div className="border-b border-border bg-muted/80 px-3 py-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">{lang}</span>
          </div>
        )}
        <pre className="overflow-x-auto p-4">
          <code className="font-mono text-[12px] leading-relaxed text-foreground/90">
            {children}
          </code>
        </pre>
      </div>
    )
  },
  table: ({ children }) => <ExportableTable>{children}</ExportableTable>,
  thead: ({ children }) => (
    <thead className="border-b border-border bg-muted/60">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/60">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-muted/30">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-sm text-foreground/90">{children}</td>
  ),
  h1: ({ children }) => (
    <h1 className="mb-4 mt-7 text-[1.6rem] font-bold leading-tight tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 text-[1.25rem] font-semibold leading-snug tracking-tight text-foreground first:mt-0 border-b border-border/50 pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2.5 mt-5 text-[1.05rem] font-semibold leading-snug text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 text-[0.95rem] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[0.875rem] leading-[1.75] text-foreground/90 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-6 text-[0.875rem] leading-[1.75] text-foreground/90">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-6 text-[0.875rem] leading-[1.75] text-foreground/90">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-[1.75]">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-md border-l-[3px] border-primary/50 bg-primary/5 py-2 pl-4 pr-3 italic text-[0.875rem] leading-relaxed text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-border/50" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
  del: ({ children }) => (
    <del className="text-muted-foreground line-through">{children}</del>
  ),
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({ content }: { content: string }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    )
  },
  (prev, next) => prev.content === next.content,
)

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

export const Markdown = memo(function Markdown({ children, className, id }: MarkdownProps) {
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])
  return (
    <div className={cn('min-w-0', className)} data-message-id={id}>
      {blocks.map((block, i) => (
        <MemoizedMarkdownBlock key={i} content={block} />
      ))}
    </div>
  )
})

Markdown.displayName = 'Markdown'
