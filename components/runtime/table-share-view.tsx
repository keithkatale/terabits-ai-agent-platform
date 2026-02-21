'use client'

import { useState } from 'react'
import { Download, Copy, Check, Table2 } from 'lucide-react'

interface TableShareViewProps {
  heading: string | null
  data: string[][]
}

export function TableShareView({ heading, data }: TableShareViewProps) {
  const [copied, setCopied] = useState(false)

  const [header, ...rows] = data

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCSV = () => {
    const csv = data
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${heading ?? 'table'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadXLSX = async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${heading ?? 'table'}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Table2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-foreground">
              {heading ?? 'Shared Table'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
            <button
              onClick={downloadXLSX}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              XLSX
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Table */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {heading && (
          <h1 className="mb-6 text-xl font-bold text-foreground">{heading}</h1>
        )}

        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full border-collapse text-sm">
            {header && header.length > 0 && (
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  {header.map((cell, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-border/60">
              {rows.map((row, ri) => (
                <tr key={ri} className="transition-colors hover:bg-muted/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-sm text-foreground/90">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {rows.length} row{rows.length !== 1 ? 's' : ''} · {header?.length ?? 0} column{(header?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">
            Powered by{' '}
            <a href="/" className="font-medium text-foreground hover:underline">
              Terabits AI
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
