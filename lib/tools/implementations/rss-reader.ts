import { tool } from 'ai'
import { z } from 'zod'

interface FeedItem {
  title: string
  url: string
  summary: string
  published_at: string | null
}

function extractTag(xml: string, tag: string): string {
  // Match <tag>...</tag> or <tag attr>...</tag> — non-greedy
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (!m) return ''
  // Strip any inner XML tags (e.g. CDATA, HTML in description)
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i')
  const m = xml.match(re)
  return m ? m[1] : ''
}

function parseItems(xml: string, itemTag: string, linkTag: string): FeedItem[] {
  const itemPattern = new RegExp(`<${itemTag}[\\s>][\\s\\S]*?<\\/${itemTag}>`, 'gi')
  const rawItems = xml.match(itemPattern) ?? []

  return rawItems.map((item) => {
    const title = extractTag(item, 'title') || '(no title)'
    // Atom uses <link href="..."/>, RSS uses <link>url</link>
    const url =
      extractAttr(item, 'link', 'href') ||
      extractTag(item, linkTag) ||
      extractTag(item, 'link') ||
      ''
    const summary =
      extractTag(item, 'summary') ||
      extractTag(item, 'description') ||
      extractTag(item, 'content') ||
      ''
    const published =
      extractTag(item, 'pubDate') ||
      extractTag(item, 'published') ||
      extractTag(item, 'updated') ||
      null

    return {
      title,
      url: url.trim(),
      summary: summary.slice(0, 400) + (summary.length > 400 ? '…' : ''),
      published_at: published,
    }
  })
}

export const rssReader = tool({
  description:
    'Fetch and parse an RSS or Atom news feed. Returns the feed title and a list of recent items with title, URL, summary, and publish date.',
  inputSchema: z.object({
    url: z.string().describe('The URL of the RSS or Atom feed'),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of items to return (default: 20)'),
  }),
  execute: async ({ url, limit = 20 }) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TerabitsAI-Agent/1.0 (RSS reader)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(12_000),
      })

      if (!response.ok) {
        return {
          error: `Feed returned HTTP ${response.status} ${response.statusText}`,
          items: [],
        }
      }

      const xml = await response.text()

      // Detect Atom vs RSS
      const isAtom = /<feed[\s>]/i.test(xml)

      const feedTitle =
        extractTag(xml.split(isAtom ? '<entry' : '<item')[0], 'title') ||
        new URL(url).hostname

      const items = isAtom ? parseItems(xml, 'entry', 'link') : parseItems(xml, 'item', 'link')

      return {
        feed_title: feedTitle,
        feed_url: url,
        format: isAtom ? 'atom' : 'rss',
        total_items: items.length,
        items: items.slice(0, limit),
      }
    } catch (e) {
      return {
        error: `Failed to fetch feed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        items: [],
      }
    }
  },
})
