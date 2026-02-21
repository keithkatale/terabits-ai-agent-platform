import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (if using Vercel Cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Find images older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: expiredImages, error: queryError } = await supabase
      .from('generated_images')
      .select('id, storage_path')
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (queryError) {
      console.error('Database query error:', queryError)
      return NextResponse.json(
        { error: `Database error: ${queryError.message}` },
        { status: 500 }
      )
    }

    if (!expiredImages || expiredImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired images to cleanup',
        deletedCount: 0,
      })
    }

    // Delete files from storage
    let storageDeletedCount = 0
    for (const image of expiredImages) {
      try {
        const { error: storageError } = await supabase.storage
          .from('ai-generated-images')
          .remove([image.storage_path])

        if (!storageError) {
          storageDeletedCount++
        } else {
          console.error(
            `Failed to delete storage file ${image.storage_path}:`,
            storageError
          )
        }
      } catch (err) {
        console.error(`Error deleting storage file ${image.storage_path}:`, err)
      }
    }

    // Delete database records
    const imageIds = expiredImages.map((img) => img.id)
    const { error: deleteError, count } = await supabase
      .from('generated_images')
      .delete()
      .in('id', imageIds)

    if (deleteError) {
      console.error('Failed to delete database records:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete records: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete`,
      deletedCount: count || imageIds.length,
      storageDeletedCount,
    })
  } catch (error) {
    console.error('Cleanup job error:', error)
    return NextResponse.json(
      { error: 'Cleanup job failed' },
      { status: 500 }
    )
  }
}
