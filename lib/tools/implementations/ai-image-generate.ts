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
        throw new Error(`Image generation API error: ${response.status} - ${errorText}`)
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: {
                mimeType?: string
                data?: string
              }
            }>
          }
        }>
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No images generated from API')
      }

      // Get the first candidate's image
      const candidate = data.candidates[0]
      if (!candidate.content?.parts?.[0]?.inlineData?.data) {
        throw new Error('Invalid API response: no image data found')
      }

      // The image comes as base64-encoded data
      const imageBuffer = Buffer.from(candidate.content.parts[0].inlineData.data, 'base64')

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
