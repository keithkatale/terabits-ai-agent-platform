#!/usr/bin/env node
/**
 * Run 20260226 desktop/scheduling migrations.
 * Reads POSTGRES_URL_NON_POOLING from .env.local (no shell parsing).
 * Requires: psql on PATH.
 */
import { readFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const migrationsDir = join(root, 'supabase', 'migrations')

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (m) process.env[m[1]] = m[2].trim()
    }
  } catch (_) {
    // no .env.local
  }
}

loadEnv()
const url = process.env.POSTGRES_URL_NON_POOLING
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING not set. Add it to .env.local.')
  process.exit(1)
}

const migrations = [
  '20260226_desktops.sql',
  '20260226_desktop_files_bucket.sql',
  '20260226_scheduled_tasks.sql',
  '20260226_backfill_desktops_from_sessions.sql',
]

for (const name of migrations) {
  const file = join(migrationsDir, name)
  const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', file], {
    stdio: 'inherit',
    shell: false,
  })
  if (r.status !== 0) {
    console.error(`Failed: ${name}`)
    process.exit(1)
  }
  console.log('Applied:', name)
}
console.log('All four migrations applied.')
