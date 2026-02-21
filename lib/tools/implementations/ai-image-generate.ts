import { tool } from 'ai'
import { z } from 'zod'

export const aiImageGenerate = tool({
  description:
    'Generate images from text descriptions using Google Imagen 3 model. Supports configurable resolutions (512x512, 768x768, 1024x1024). Specify resolution in prompt like "512 image of..." or use default 1024x1024.',
  inputSchema: z.object({
    prompt: z
      .string()
      .min(10)
      .max(2000)
      .describe('Detailed image description (10-2000 characters)'),
    resolution: z
      .enum(['512x512', '768x768', '1024x1024'])
      .optional()
      .default('1024x1024')
      .describe('Image resolution: 512x512, 768x768, or 1024x1024 (default: 1024x1024)'),
  }),
  execute: async ({ prompt, resolution = '1024x1024' }) => {
    try {
      // Import Supabase client only on server-side execution
      const { createClient } = await import('@/lib/supabase/server')
      const { nanoid } = await import('nanoid')

      // Parse resolution shortcuts in prompt (e.g., "512 image of X" → 512x512)
      let finalResolution = resolution
      const resMatch = prompt.match(/\b(512|768|1024)\b/)
      if (resMatch) {
        const size = resMatch[1]
        finalResolution = `${size}x${size}` as '512x512' | '768x768' | '1024x1024'
      }

      // Call Google Imagen 3 API via REST
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt,
              },
            ],
            parameters: {
              sampleCount: 1,
              guidance_scale: 7.5,
              aspect_ratio: '1:1',
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Imagen API error: ${response.status} - ${errorText}`)
      }

      const data = (await response.json()) as { predictions: Array<{ bytesBase64Encoded?: string; imageUrl?: string }> }

      if (!data.predictions || data.predictions.length === 0) {
        throw new Error('No images generated from Imagen API')
      }

      // Get the first image
      const prediction = data.predictions[0]
      let imageBuffer: Buffer

      // Handle either base64-encoded bytes or direct image URL
      if (prediction.bytesBase64Encoded) {
        imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64')
      } else if (prediction.imageUrl) {
        // Download image from URL
        const imgResponse = await fetch(prediction.imageUrl)
        if (!imgResponse.ok) {
          throw new Error(`Failed to download image from Imagen: ${imgResponse.status}`)
        }
        imageBuffer = Buffer.from(await imgResponse.arrayBuffer())
      } else {
        throw new Error('Invalid Imagen API response: no image data')
      }

      const fileSizeKb = Math.round(imageBuffer.length / 1024)

      // Upload to Supabase Storage
      const supabase = await createClient()
      const imageId = nanoid(12)
      const promptSlug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
      const fileName = `${imageId}-${promptSlug}.png`

      // Path: generated-images/{imageId}-{slug}.png
      const bucketPath = `generated-images/${fileName}`

      const uploadResponse = await supabase.storage.from('ai-generated-images').upload(bucketPath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

      if (uploadResponse.error) {
        throw new Error(`Storage upload failed: ${uploadResponse.error.message}`)
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('ai-generated-images').getPublicUrl(bucketPath)
      const publicUrl = publicUrlData?.publicUrl || ''

      // Calculate expiration date (30 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      return {
        success: true,
        image_url: publicUrl,
        storage_path: bucketPath,
        size: finalResolution,
        mime_type: 'image/png',
        file_size_kb: fileSizeKb,
        expires_at: expiresAt.toISOString(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Image generation failed: ${errorMessage}`,
      }
    }
  },
})
