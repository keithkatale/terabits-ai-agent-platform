'use client'

import { useEffect, useState, useRef } from 'react'
import { MessageSquare, FolderOutput, Upload, FileText, Pencil, Star, Share2, MoreVertical, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssistantChat } from '@/components/dashboard/assistant-chat'
import { WorkspaceFileTree } from './workspace-file-tree'
import { WorkspaceUpload } from './workspace-upload'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface DesktopDetailTabsProps {
  desktopId: string
}

interface DesktopData {
  id: string
  title: string | null
  project_instructions: string | null
  created_at: string
  updated_at: string
}

export function DesktopDetailTabs({ desktopId }: DesktopDetailTabsProps) {
  const [desktop, setDesktop] = useState<DesktopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [instructions, setInstructions] = useState('')
  const [savingInstructions, setSavingInstructions] = useState(false)
  const [outputsRefresh, setOutputsRefresh] = useState(0)
  const [uploadsRefresh, setUploadsRefresh] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [outputCount, setOutputCount] = useState(0)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadCurrentPath, setUploadCurrentPath] = useState('uploads')

  useEffect(() => {
    fetch(`/api/desktops/${encodeURIComponent(desktopId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setDesktop(d)
          setInstructions(d.project_instructions ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [desktopId])

  const saveInstructions = () => {
    setSavingInstructions(true)
    fetch(`/api/desktops/${encodeURIComponent(desktopId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_instructions: instructions }),
    })
      .then((r) => {
        if (r.ok) {
          setDesktop((prev) => (prev ? { ...prev, project_instructions: instructions } : null))
        }
      })
      .finally(() => setSavingInstructions(false))
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  const displayTitle = desktop?.title?.trim() || 'New desktop'

  const saveTitle = () => {
    const value = titleInput.trim()
    setEditingTitle(false)
    if (value === displayTitle) return
    fetch(`/api/desktops/${encodeURIComponent(desktopId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: value || null }),
    })
      .then((r) => {
        if (r.ok) {
          setDesktop((prev) => (prev ? { ...prev, title: value || null } : null))
        }
      })
      .catch(() => {})
  }

  const startEditingTitle = () => {
    setTitleInput(displayTitle)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 px-5 pt-4 pb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveTitle()
                }
                if (e.key === 'Escape') {
                  setEditingTitle(false)
                  setTitleInput(displayTitle)
                }
              }}
              className="flex-1 min-w-0 text-lg font-semibold text-foreground bg-transparent border-b border-foreground/30 outline-none focus:border-primary py-0.5"
              placeholder="Name this desktop"
            />
          ) : (
            <>
              <h1 className="truncate text-lg font-semibold text-foreground">{displayTitle}</h1>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={startEditingTitle}
                title="Edit desktop name"
                aria-label="Edit desktop name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                title="Favorite"
                aria-label="Favorite"
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground gap-1.5"
          title="Share"
          aria-label="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="text-sm">Share</span>
        </Button>
      </div>
      <Tabs defaultValue="session" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-5 pt-0 pb-1">
          <TabsList className="inline-flex w-auto max-w-full justify-start rounded-none bg-transparent p-0 h-8 shrink-0 gap-0 border-0 shadow-none">
          <TabsTrigger
            value="session"
            className="rounded-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 border-b-2 border-transparent data-[state=active]:border-amber-400 flex-none"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Session
          </TabsTrigger>
          <TabsTrigger
            value="outputs"
            className="rounded-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 border-b-2 border-transparent data-[state=active]:border-amber-400 flex-none"
          >
            <FolderOutput className="h-3 w-3 mr-1" />
            outputs
          </TabsTrigger>
          <TabsTrigger
            value="uploads"
            className="rounded-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 border-b-2 border-transparent data-[state=active]:border-amber-400 flex-none"
          >
            <Upload className="h-3 w-3 mr-1" />
            uploads
          </TabsTrigger>
          <TabsTrigger
            value="instructions"
            className="rounded-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-0 border-b-2 border-transparent data-[state=active]:border-amber-400 flex-none"
          >
            <FileText className="h-3 w-3 mr-1" />
            Instructions
          </TabsTrigger>
        </TabsList>
        </div>
        <TabsContent value="session" className="min-h-0 flex-1 mt-0 overflow-hidden bg-white">
          <div className="h-full overflow-hidden bg-white">
            <AssistantChat initialSessionId={desktopId} />
          </div>
        </TabsContent>
        <TabsContent value="outputs" className="min-h-0 flex-1 mt-0 overflow-auto bg-white data-[state=inactive]:hidden" forceMount>
          <div className="w-full max-w-3xl mx-auto px-5 py-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-sm font-semibold text-foreground">outputs</span>
              <span className="text-sm text-muted-foreground">{outputCount === 1 ? '1 item' : `${outputCount} items`}</span>
              <div className="flex items-center gap-1 ml-auto">
                <a
                  href={`/api/desktops/${encodeURIComponent(desktopId)}/files/output/zip`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5"
                  title="Download as zip"
                  download="output.zip"
                >
                  <Plus className="h-4 w-4" />
                </a>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" title="More options" aria-label="More options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <WorkspaceFileTree
              desktopId={desktopId}
              path="output"
              readOnly={false}
              refreshTrigger={outputsRefresh}
              onDeleted={() => setOutputsRefresh((n) => n + 1)}
              onLoaded={(items) => setOutputCount(items.length)}
            />
          </div>
        </TabsContent>
        <TabsContent value="uploads" className="min-h-0 flex-1 mt-0 overflow-auto bg-white data-[state=inactive]:hidden" forceMount>
          <div className="w-full max-w-3xl mx-auto px-5 py-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-sm font-semibold text-foreground">uploads</span>
              <span className="text-sm text-muted-foreground">{uploadCount === 1 ? '1 item' : `${uploadCount} items`}</span>
              <div className="flex items-center gap-1 ml-auto">
                <WorkspaceUpload
                  desktopId={desktopId}
                  path={uploadCurrentPath}
                  onUploaded={() => setUploadsRefresh((n) => n + 1)}
                  iconOnly
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" title="More options" aria-label="More options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <WorkspaceFileTree
              desktopId={desktopId}
              path="uploads"
              readOnly={false}
              hierarchical
              refreshTrigger={uploadsRefresh}
              onPathChange={setUploadCurrentPath}
              onDeleted={() => setUploadsRefresh((n) => n + 1)}
              onLoaded={(items) => setUploadCount(items.length)}
            />
          </div>
        </TabsContent>
        <TabsContent value="instructions" className="min-h-0 flex-1 mt-0 overflow-auto bg-white">
          <div className="w-full max-w-3xl mx-auto px-5 py-6">
            <textarea
              className="w-full min-h-[60vh] bg-white text-foreground text-sm leading-relaxed resize-none border-0 shadow-none outline-none focus:ring-0 placeholder:text-muted-foreground/50 py-0"
              placeholder="Project-specific instructions and context for the AI in this desktop. Write here…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="mt-4 pt-2">
              <button
                type="button"
                onClick={saveInstructions}
                disabled={savingInstructions}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {savingInstructions ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1.5 align-middle" /> : null}
                Save instructions
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
