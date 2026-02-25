/**
 * Execution context for agent runs. Tools (e.g. gmail_send) can read the
 * current user id; browser_automation can read browserMode for "connect account" flows.
 */

import { AsyncLocalStorage } from 'async_hooks'

export type BrowserMode = 'playwright' | 'gemini' | 'auto'

export interface ExecutionContext {
  userId: string | null
  /** When set (e.g. for "Connect account" flow), browser_automation uses Gemini Computer Use. */
  browserMode?: BrowserMode
}

const storage = new AsyncLocalStorage<ExecutionContext>()

export function runWithExecutionContext<T>(context: ExecutionContext, fn: () => T): T {
  return storage.run(context, fn)
}

export function getExecutionUserId(): string | null {
  return storage.getStore()?.userId ?? null
}

export function getExecutionBrowserMode(): BrowserMode | null {
  return storage.getStore()?.browserMode ?? null
}
