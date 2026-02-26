'use client'

import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Upload, Loader2, Plus, FolderUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface WorkspaceUploadProps {
  desktopId: string
  path: string
  onUploaded?: () => void
  className?: string
  /** Compact icon-only button (e.g. for tab header); opens menu to choose file vs folder */
  iconOnly?: boolean
}

function dirname(relativePath: string): string {
  const i = relativePath.lastIndexOf('/')
  return i <= 0 ? '' : relativePath.slice(0, i)
}

export function WorkspaceUpload({ desktopId, path, onUploaded, className, iconOnly }: WorkspaceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Set folder input attributes so browser shows folder picker (React doesn't pass webkitdirectory through)
  useEffect(() => {
    const el = folderRef.current
    if (!el) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
    el.setAttribute('multiple', '')
  }, [])

  const uploadOne = (filePath: string, file: File): Promise<void> => {
    const form = new FormData()
    form.set('path', filePath)
    form.set('file', file)
    return fetch(`/api/desktops/${encodeURIComponent(desktopId)}/files`, {
      method: 'POST',
      body: form,
    }).then((r) => {
      if (r.ok) return
      return r.json().then((d) => Promise.reject(new Error(d?.error ?? 'Upload failed')))
    })
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const toastId = toast.loading(`Uploading file: ${file.name}`)
    uploadOne(path, file)
      .then(() => {
        toast.success(`Uploaded: ${file.name}`, { id: toastId })
        onUploaded?.()
      })
      .catch((err) => {
        toast.error(`Failed to upload ${file.name}`, { id: toastId })
        console.error(err)
      })
      .finally(() => {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      })
  }

  const handleFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const fileList = Array.from(files)
    const firstRelative = (fileList[0] as File & { webkitRelativePath?: string }).webkitRelativePath || ''
    const folderName = firstRelative.split('/')[0] ?? 'folder'
    setUploading(true)
    const toastId = toast.loading(`Uploading folder: ${folderName} (${fileList.length} file${fileList.length === 1 ? '' : 's'})`)
    const base = path.replace(/\/+$/, '')
    const promises: Promise<void>[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]!
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const parts = relativePath.split('/')
      const rest = parts.slice(1).join('/') || file.name
      const dir = dirname(rest)
      const filePath = dir ? `${base}/${folderName}/${dir}` : `${base}/${folderName}`
      promises.push(uploadOne(filePath, file))
    }
    Promise.all(promises)
      .then(() => {
        toast.success(`Uploaded folder: ${folderName} (${fileList.length} file${fileList.length === 1 ? '' : 's'})`, { id: toastId })
        onUploaded?.()
      })
      .catch((err) => {
        toast.error(`Failed to upload folder: ${folderName}`, { id: toastId })
        console.error(err)
      })
      .finally(() => {
        setUploading(false)
        if (folderRef.current) folderRef.current.value = ''
      })
  }

  const triggerFile = () => inputRef.current?.click()
  const triggerFolder = () => folderRef.current?.click()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
      <input
        ref={folderRef}
        type="file"
        className="hidden"
        onChange={handleFolder}
        disabled={uploading}
      />
      {iconOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              disabled={uploading}
              title="Upload"
              aria-label="Upload files or folder"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem onSelect={triggerFile}>
              <Upload className="h-4 w-4" />
              Upload files
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={triggerFolder}>
              <FolderUp className="h-4 w-4" />
              Upload folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl bg-[#f7f6f3]/80 hover:bg-[#f7f6f3]"
            onClick={triggerFile}
            disabled={uploading}
            title="Upload file"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /><span className="ml-1.5">Upload</span></>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl bg-[#f7f6f3]/80 hover:bg-[#f7f6f3]"
            onClick={triggerFolder}
            disabled={uploading}
            title="Upload folder"
          >
            <FolderUp className="h-4 w-4" />
            <span className="ml-1.5">Folder</span>
          </Button>
        </>
      )}
    </div>
  )
}
