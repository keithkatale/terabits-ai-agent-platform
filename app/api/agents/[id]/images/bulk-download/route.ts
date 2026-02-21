import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch image records from database
    const { data: images, error: dbError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('agent_id', agentId)
      .in('id', imageIds)

    if (dbError) {
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      )
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images found' },
        { status: 404 }
      )
    }

    // Create ZIP archive
    const zip = new JSZip()
    const imagesFolder = zip.folder('images')

    if (!imagesFolder) {
      return NextResponse.json(
        { error: 'Failed to create ZIP' },
        { status: 500 }
      )
    }

    // Download and add each image to ZIP
    for (const image of images) {
      try {
        const response = await fetch(image.public_url)
        if (!response.ok) {
          console.error(`Failed to fetch image ${image.id}`)
          continue
        }

        const buffer = await response.arrayBuffer()
        const filename = `${image.id.slice(0, 8)}-${image.prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}.png`
        imagesFolder.file(filename, buffer)
      } catch (err) {
        console.error(`Error downloading image ${image.id}:`, err)
      }
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="generated-images-${Date.now()}.zip"`,
      },
    })
  } catch (error) {
    console.error('Bulk download error:', error)
    return NextResponse.json(
      { error: 'Failed to create ZIP download' },
      { status: 500 }
    )
  }
}
