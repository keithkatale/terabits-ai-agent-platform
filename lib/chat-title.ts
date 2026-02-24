/**
 * Generate a short, descriptive title for a chat from the user's first message.
 * Used so conversation names reflect the aim of the chat (e.g. "Hey!" → "Greeting", "What can you do?" → "Capability inquiry").
 */

import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

const TITLE_PROMPT = `You are a conversation titler. Given the first message of a chat, reply with a very short title (2–6 words) that describes the aim, topic, or intent—not a copy of the message.

Examples:
- "Hey!" → Greeting
- "What can you do?" → Capability inquiry
- "Find me 50 plumber leads in Texas" → Plumber leads (Texas)
- "Summarise this article https://..." → Article summary
- "Send an email to John about the meeting" → Email to John

Reply with ONLY the title, no quotes or punctuation. Keep it concise and neutral.`

export async function generateChatTitle(firstMessage: string): Promise<string> {
  const trimmed = (firstMessage || '').trim().slice(0, 500)
  if (!trimmed) return 'New conversation'
  try {
    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: `${TITLE_PROMPT}\n\nFirst message:\n${trimmed}`,
      maxTokens: 30,
    })
    const title = (text || '').trim().replace(/^["']|["']$/g, '')
    return title || trimmed.slice(0, 40) || 'New conversation'
  } catch {
    return trimmed.slice(0, 40) || 'New conversation'
  }
}
