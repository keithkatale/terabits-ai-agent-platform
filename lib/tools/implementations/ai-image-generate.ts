import { tool } from 'ai'
import { z } from 'zod'

export const aiImageGenerate = tool({
  description:
    'Generate images from text descriptions using Google Gemini 2.5 Flash (image generation). Supports configurable resolutions (512x512, 768x768, 1024x1024). Specify resolution in prompt like "512 image of..." or use default 1024x1024.',
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

      // Call Google Gemini 2.5 Flash Image API
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[ai-image-generate] API error: ${response.status}`, errorText)
        throw new Error(`Image generation API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('[ai-image-generate] Full API response:', JSON.stringify(data, null, 2))

      // Handle different possible response formats
      let imageBuffer: Buffer | null = null

      // Format 1: candidates array with inlineData (standard generative API response)
      if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
        const candidate = data.candidates[0]
        console.log('[ai-image-generate] Candidate structure:', {
          hasContent: !!candidate.content,
          hasParts: !!candidate.content?.parts,
          partsLength: candidate.content?.parts?.length,
          part0: candidate.content?.parts?.[0],
        })

        // Check multiple possible locations for image data
        const inlineData = candidate.content?.parts?.[0]?.inlineData
        console.log('[ai-image-generate] InlineData:', {
          exists: !!inlineData,
          mimeType: inlineData?.mimeType,
          dataLength: inlineData?.data?.length,
        })

        if (inlineData?.data) {
          console.log('[ai-image-generate] ✓ Found image in candidates[0].content.parts[0].inlineData.data')
          imageBuffer = Buffer.from(inlineData.data, 'base64')
          console.log('[ai-image-generate] Buffer created, size:', imageBuffer.length)
        } else {
          console.log('[ai-image-generate] ✗ inlineData.data not found')
          console.log('[ai-image-generate] candidate.content.parts[0]:', JSON.stringify(candidate.content?.parts?.[0], null, 2))
        }
      }

      // Format 2: Direct images array (alternate format)
      if (!imageBuffer && data.images && Array.isArray(data.images) && data.images.length > 0) {
        const imageData = data.images[0]
        if (imageData.image) {
          console.log('[ai-image-generate] ✓ Found image in images[0].image')
          imageBuffer = Buffer.from(imageData.image, 'base64')
        }
      }

      if (!imageBuffer) {
        console.error('[ai-image-generate] ✗ No image found. Full response:', JSON.stringify(data, null, 2))
        throw new Error('Invalid API response: no image data found')
      }

      console.log('[ai-image-generate] ✓ Successfully decoded image, size:', imageBuffer.length, 'bytes')

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
