'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Loader2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkspaceFileTree } from './workspace-file-tree'
import { WorkspaceUpload } from './workspace-upload'
import { cn } from '@/lib/utils'

interface DesktopRefsTabProps {
  desktopId: string
}

export function DesktopRefsTab({ desktopId }: DesktopRefsTabProps) {
  const [refs, setRefs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')

  const fetchRefs = () => {
    fetch(`/api/desktops/${encodeURIComponent(desktopId)}/refs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.refs) setRefs(d.refs)
        else setRefs([])
      })
      .catch(() => setRefs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRefs()
  }, [desktopId])

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    fetch(`/api/desktops/${encodeURIComponent(desktopId)}/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then((r) => {
        if (r.ok) {
          setNewName('')
          setExpanded((prev) => new Set(prev).add(name))
          fetchRefs()
        }
      })
      .finally(() => setCreating(false))
  }

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading references…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="New reference name"
          className="rounded-xl bg-[#f7f6f3]/60 px-3 py-2 text-sm ring-1 ring-black/5 focus:ring-1 focus:ring-amber-400/50 focus:outline-none"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1.5">Add ref</span>
        </Button>
      </div>
      {refs.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          <span className="text-sm">No references yet. Add one above.</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {refs.map((name) => {
            const isExpanded = expanded.has(name)
            return (
              <li key={name} className="rounded-2xl bg-[#f7f6f3]/60 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium hover:bg-white/50 rounded-2xl transition-colors"
                  onClick={() => toggleExpand(name)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  {name}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-0">
                    <WorkspaceUpload
                      desktopId={desktopId}
                      path={`refs/${name}`}
                      onUploaded={() => {}}
                      className="mb-2"
                    />
                    <WorkspaceFileTree
                      desktopId={desktopId}
                      path={`refs/${name}`}
                      readOnly={false}
                      onDeleted={() => {}}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
