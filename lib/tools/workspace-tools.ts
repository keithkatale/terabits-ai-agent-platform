/**
 * Workspace tools for desktop sessions: read, write, list files in desktop-files storage.
 * Use getWorkspaceTools(desktopId) to get tools with desktop_id bound (inject when sessionId is a valid desktop).
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function listRecursive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string
): Promise<{ name: string; path: string }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 500 })
  if (error) return []
  const items: { name: string; path: string }[] = []
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id != null) {
      items.push({ name: item.name, path: fullPath })
    } else {
      items.push(...(await listRecursive(supabase, bucket, fullPath)))
    }
  }
  return items
}

export type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>

/**
 * Returns workspace tools with desktop_id bound. Use in chat/run when sessionId is a valid desktop.
 * When userId is provided, also adds schedule_task for scheduling a task to run later (cron).
 * Pass optional supabaseClient when running outside request context (e.g. worker); otherwise createClient() is used.
 * Reference folders are under refs/{name}/ (e.g. refs/MyRef/file.txt); list_workspace_files and read_workspace_file support these paths.
 */
export function getWorkspaceTools(desktopId: string, userId?: string, supabaseClient?: SupabaseClientLike): Record<string, ReturnType<typeof tool>> {
  const bucket = 'desktop-files'
  const getClient = (): Promise<SupabaseClientLike> =>
    supabaseClient != null ? Promise.resolve(supabaseClient) : createClient()

  const read_workspace_file = tool({
    description:
      'Read a file from the current workspace (desktop). Path is relative to the workspace root, e.g. "uploads/doc.txt", "output/report.md", or "refs/MyRef/data.json". Reference folders are under refs/{name}/. Returns text for text files or base64 for binary.',
    inputSchema: z.object({
      path: z.string().describe('Relative path within the workspace, e.g. uploads/file.txt or output/result.md'),
    }),
    execute: async ({ path }) => {
      const supabase = await getClient()
      const objectPath = `${desktopId}/${path.replace(/^\/+/, '')}`
      const { data, error } = await supabase.storage.from(bucket).download(objectPath)
      if (error) {
        return { error: error.message, path }
      }
      const buffer = Buffer.from(await data.arrayBuffer())
      const head = buffer.subarray(0, 512)
      const hasBinary = head.some((b) => b === 0 || b > 127)
      if (!hasBinary && buffer.length < 500_000) {
        return { path, content: buffer.toString('utf-8'), encoding: 'utf-8' }
      }
      return { path, content: buffer.toString('base64'), encoding: 'base64' }
    },
  })

  const write_workspace_file = tool({
    description:
      'Write content to the workspace under output/. Use for saving results, reports, or generated files. Path can be "output/filename" or just "filename" (saved under output/).',
    inputSchema: z.object({
      path: z.string().describe('Path under output, e.g. "report.md" or "output/summary.txt"'),
      content: z.string().describe('File content (text)'),
    }),
    execute: async ({ path, content }) => {
      const supabase = await getClient()
      const normalized = path.replace(/^\/+/, '').startsWith('output/') ? path.replace(/^\/+/, '') : `output/${path.replace(/^\/+/, '')}`
      const objectPath = `${desktopId}/${normalized}`
      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, Buffer.from(content, 'utf-8'), { contentType: 'text/plain', upsert: true })
      if (error) {
        return { error: error.message, path: normalized }
      }
      return { path: normalized, ok: true }
    },
  })

  const list_workspace_files = tool({
    description:
      'List files and folders under a path in the workspace. Path can be "uploads", "output", or "refs/RefName". Reference folders are under refs/{name}/.',
    inputSchema: z.object({
      path: z.string().describe('Path to list, e.g. uploads, output, or refs/MyRef'),
    }),
    execute: async ({ path }) => {
      const supabase = await getClient()
      const prefix = `${desktopId}/${path.replace(/^\/+|\/+$/g, '')}`
      const items = await listRecursive(supabase, bucket, prefix)
      return { path, items: items.map(({ name, path: p }) => ({ name, path: p })) }
    },
  })

  const tools: Record<string, ReturnType<typeof tool>> = {
    read_workspace_file,
    write_workspace_file,
    list_workspace_files,
  }

  if (userId) {
    tools.schedule_task = tool({
      description:
        'Schedule a task to run later on this desktop. Use when the user or you want something to run at a specific time (e.g. "remind me in 1 hour", "run this at 5pm"). The task will run even if the tab is closed.',
      inputSchema: z.object({
        run_at: z.string().describe('When to run: ISO 8601 datetime string, e.g. 2025-02-27T17:00:00Z'),
        payload: z.object({
          task: z.string().optional().describe('Short description of what to do'),
          message: z.string().optional().describe('User-facing message for the run'),
          description: z.string().optional().describe('Alternate description field'),
        }).passthrough().describe('Payload: at least task, message, or description'),
      }),
      execute: async ({ run_at, payload }) => {
        const supabase = await getClient()
        const runAt = new Date(run_at)
        if (Number.isNaN(runAt.getTime())) {
          return { error: 'Invalid run_at: must be a valid ISO datetime string' }
        }
        if (runAt.getTime() <= Date.now()) {
          return { error: 'run_at must be in the future' }
        }
        const payloadObj = typeof payload === 'object' && payload !== null
          ? { ...payload, task: payload.task ?? payload.message ?? payload.description }
          : { task: String(payload) }
        const { data, error } = await supabase
          .from('scheduled_tasks')
          .insert({
            desktop_id: desktopId,
            user_id: userId,
            run_at: runAt.toISOString(),
            payload: payloadObj,
            status: 'pending',
            source: 'user_instruction',
          })
          .select('id')
          .single()
        if (error) {
          return { error: error.message }
        }
        return { success: true, taskId: data?.id }
      },
    })
  }

  return tools
}
