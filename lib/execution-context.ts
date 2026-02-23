/**
 * Execution context for agent runs. Tools (e.g. gmail_send) can read the
 * current user id to use per-user integrations (Gmail OAuth tokens).
 */

import { AsyncLocalStorage } from 'async_hooks'

export interface ExecutionContext {
  userId: string | null
}

const storage = new AsyncLocalStorage<ExecutionContext>()

export function runWithExecutionContext<T>(context: ExecutionContext, fn: () => T): T {
  return storage.run(context, fn)
}

export function getExecutionUserId(): string | null {
  return storage.getStore()?.userId ?? null
}
