'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageCard } from '@/components/ui/image-card'
import type { GeneratedImage } from '@/lib/types'

interface ImageGalleryProps {
  images: GeneratedImage[]
  agentId: string
}

export function ImageGallery({ images, agentId }: ImageGalleryProps) {
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true)
    try {
      const response = await fetch(
        `/api/agents/${agentId}/images/bulk-download`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageIds: images.map((img) => img.id),
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to download ZIP')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `images-${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download ZIP:', error)
    } finally {
      setIsDownloadingZip(false)
    }
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No images generated yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Generated Images ({images.length})
        </h3>
        {images.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 mr-1" />
                Download All as ZIP
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            url={image.public_url}
            prompt={image.prompt}
            resolution={image.resolution}
            expiresAt={image.created_at}
          />
        ))}
      </div>
    </div>
  )
}
