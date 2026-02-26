'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Trash2, Loader2, File, FolderOpen, Folder, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface WorkspaceFileItem {
  name: string
  path: string
  folder?: boolean
}

interface WorkspaceFileTreeProps {
  desktopId: string
  path: string
  /** e.g. "output" or "uploads" or "refs/RefName" */
  readOnly?: boolean
  /** When true, list one level at a time with folders navigable and breadcrumb */
  hierarchical?: boolean
  /** When this value changes, refetch the current path (e.g. after upload/delete). Avoids refetch on tab switch. */
  refreshTrigger?: number
  onDeleted?: () => void
  onLoaded?: (items: WorkspaceFileItem[]) => void
  /** Called when current directory path changes (hierarchical mode). Use for upload path. */
  onPathChange?: (currentPath: string) => void
  className?: string
}

/** Strip desktopId prefix from storage path to get segment path for API */
function relativePath(desktopId: string, fullPath: string): string {
  const prefix = desktopId + '/'
  return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath
}

export function WorkspaceFileTree({
  desktopId,
  path,
  readOnly = false,
  hierarchical = false,
  refreshTrigger,
  onDeleted,
  onLoaded,
  onPathChange,
  className,
}: WorkspaceFileTreeProps) {
  const [currentPath, setCurrentPath] = useState(path)
  const [items, setItems] = useState<WorkspaceFileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const listPath = hierarchical ? currentPath : path
  const fetchList = useCallback(() => {
    setLoading(true)
    const url = hierarchical
      ? `/api/desktops/${encodeURIComponent(desktopId)}/files?path=${encodeURIComponent(listPath)}&depth=1`
      : `/api/desktops/${encodeURIComponent(desktopId)}/files?path=${encodeURIComponent(listPath)}`
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = (d?.items ?? []) as WorkspaceFileItem[]
        setItems(list)
        onLoaded?.(list)
      })
      .catch(() => {
        setItems([])
        onLoaded?.([])
      })
      .finally(() => setLoading(false))
  }, [desktopId, listPath, hierarchical, onLoaded])

  useEffect(() => {
    fetchList()
  }, [fetchList, refreshTrigger])

  useEffect(() => {
    if (hierarchical) onPathChange?.(currentPath)
  }, [hierarchical, currentPath, onPathChange])

  const handleDelete = (item: WorkspaceFileItem) => {
    if (readOnly || item.folder) return
    if (!confirm(`Delete ${item.name}?`)) return
    const seg = relativePath(desktopId, item.path)
    setDeleting(item.path)
    const segPath = seg.split('/').map((p) => encodeURIComponent(p)).join('/')
    fetch(`/api/desktops/${encodeURIComponent(desktopId)}/files/${segPath}`, { method: 'DELETE' })
      .then((r) => {
        if (r.ok) {
          setItems((prev) => prev.filter((i) => i.path !== item.path))
          onDeleted?.()
        }
      })
      .finally(() => setDeleting(null))
  }

  const goToFolder = (segmentPath: string) => setCurrentPath(segmentPath)

  const breadcrumbSegments = hierarchical
    ? (() => {
        const parts = currentPath.split('/').filter(Boolean)
        return parts.map((_, i) => ({
          name: parts[i]!,
          path: parts.slice(0, i + 1).join('/'),
        }))
      })()
    : []

  const sortedItems = hierarchical
    ? [...items].sort((a, b) => {
        const aFolder = a.folder ? 1 : 0
        const bFolder = b.folder ? 1 : 0
        if (bFolder !== aFolder) return bFolder - aFolder
        return (a.name || '').localeCompare(b.name || '')
      })
    : items

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 p-4 text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  if (items.length === 0) {
    const label = listPath === 'output' ? 'outputs' : listPath === 'uploads' ? 'uploads' : 'this folder'
    return (
      <div className={cn('flex flex-col', className)}>
        {hierarchical && breadcrumbSegments.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-3">
            <button
              type="button"
              onClick={() => goToFolder(path)}
              className="hover:text-foreground truncate"
            >
              {path || 'uploads'}
            </button>
            {breadcrumbSegments.slice(1).map((seg) => (
              <span key={seg.path} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="h-3.5 w-3.5" />
                <button
                  type="button"
                  onClick={() => goToFolder(seg.path)}
                  className="hover:text-foreground truncate max-w-[120px]"
                >
                  {seg.name}
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FolderOpen className="h-14 w-14 mb-3 opacity-40" strokeWidth={1.2} />
          <span className="text-sm">No files in {label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {hierarchical && breadcrumbSegments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-3">
          <button
            type="button"
            onClick={() => goToFolder(path)}
            className="hover:text-foreground truncate"
          >
            {path || 'uploads'}
          </button>
          {breadcrumbSegments.slice(1).map((seg) => (
            <span key={seg.path} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                type="button"
                onClick={() => goToFolder(seg.path)}
                className="hover:text-foreground truncate max-w-[120px]"
              >
                {seg.name}
              </button>
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-0.5">
        {sortedItems.map((item) => {
          const seg = relativePath(desktopId, item.path)
          const downloadUrl = `/api/desktops/${encodeURIComponent(desktopId)}/files/${seg.split('/').map((p) => encodeURIComponent(p)).join('/')}`
          const isDeleting = deleting === item.path

          if (item.folder) {
            return (
              <li
                key={item.path}
                role="button"
                tabIndex={0}
                onClick={() => goToFolder(seg || item.name)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToFolder(seg || item.name) }}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-[#f7f6f3]/70 transition-colors cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
                  <Folder className="h-4 w-4 shrink-0 text-amber-600/90" />
                  {item.name}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            )
          }

          return (
            <li
              key={item.path}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-[#f7f6f3]/70 transition-colors"
            >
              <span className="flex min-w-0 items-center gap-2 truncate text-sm">
                <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {item.name}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  asChild
                >
                  <a href={downloadUrl} download={item.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
