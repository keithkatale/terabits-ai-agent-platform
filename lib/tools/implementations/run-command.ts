/**
 * run_command: execute a shell command in a sandbox (E2B, Modal, or custom SANDBOX_API_URL).
 * Requires SANDBOX_API_URL (and optionally SANDBOX_API_KEY) to be set.
 * Sandbox API expected: POST { command, cwd?, timeout_seconds? } -> { stdout, stderr, exit_code }
 */

import { tool } from 'ai'
import { z } from 'zod'

const SANDBOX_API_URL = process.env.SANDBOX_API_URL
const SANDBOX_API_KEY = process.env.SANDBOX_API_KEY

export const runCommand = tool({
  description:
    'Run a shell command in a sandboxed environment (e.g. in the workspace). Use for running scripts, tests, or CLI tools. Command is executed in an isolated sandbox; workspace files can be made available by the sandbox provider.',
  inputSchema: z.object({
    command: z.string().describe('The shell command to run (e.g. "npm test", "python script.py")'),
    cwd: z.string().optional().describe('Working directory path relative to workspace root'),
    timeout_seconds: z.number().min(1).max(300).optional().describe('Max execution time in seconds (default 60)'),
  }),
  execute: async ({ command, cwd, timeout_seconds }) => {
    if (!SANDBOX_API_URL?.trim()) {
      return {
        error: 'run_command is not configured. Set SANDBOX_API_URL (and optionally SANDBOX_API_KEY) to use a sandbox (e.g. E2B, Modal, or custom).',
        stdout: '',
        stderr: '',
        exit_code: -1,
      }
    }
    const url = SANDBOX_API_URL.replace(/\/$/, '') + '/run'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (SANDBOX_API_KEY) headers['Authorization'] = `Bearer ${SANDBOX_API_KEY}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          command,
          cwd: cwd ?? undefined,
          timeout_seconds: timeout_seconds ?? 60,
        }),
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) {
        const text = await res.text()
        return {
          error: `Sandbox API returned ${res.status}: ${text.slice(0, 500)}`,
          stdout: '',
          stderr: '',
          exit_code: -1,
        }
      }
      const data = (await res.json()) as { stdout?: string; stderr?: string; exit_code?: number; exitCode?: number }
      const exitCode = data.exit_code ?? data.exitCode ?? -1
      return {
        stdout: data.stdout ?? '',
        stderr: data.stderr ?? '',
        exit_code: exitCode,
        ...(data.error ? { error: String(data.error) } : {}),
      }
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Sandbox request failed',
        stdout: '',
        stderr: '',
        exit_code: -1,
      }
    }
  },
})
