'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Download, Copy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageCardProps {
  url: string
  prompt: string
  resolution?: string
  showPrompt?: boolean
  expiresAt?: string
  onDownload?: () => void
}

export function ImageCard({
  url,
  prompt,
  resolution = '1024x1024',
  showPrompt = true,
  expiresAt,
  onDownload,
}: ImageCardProps) {
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const handleDownload = async () => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `generated-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      onDownload?.()
    } catch (err) {
      console.error('Failed to download image:', err)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const expiresInDays = expiresAt
    ? Math.ceil(
        (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="relative w-full bg-muted aspect-square">
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-sm">
            Failed to load image
          </div>
        ) : (
          <Image
            src={url}
            alt={prompt}
            fill
            className="object-cover"
            onLoadingComplete={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError(true)
            }}
          />
        )}
      </div>

      <div className="p-3 space-y-3">
        {showPrompt && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Prompt</p>
            <p className="text-sm text-foreground line-clamp-2">{prompt}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{resolution}</span>
          {expiresInDays !== null && (
            <>
              <span>•</span>
              <span>Expires in {expiresInDays} days</span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopyUrl}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy URL
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
