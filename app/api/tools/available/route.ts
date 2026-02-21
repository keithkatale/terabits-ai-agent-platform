// Returns which tools have their required env vars configured.
// Used by the Tools Panel to show warnings for unconfigured tools.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TOOL_CATALOG } from '@/lib/tools/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { error } = await supabase.auth.getUser()
  if (error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check which env vars are present (values are never returned — just presence)
  const envStatus: Record<string, boolean> = {}

  for (const def of TOOL_CATALOG) {
    if (!def.envVars) continue
    for (const varName of def.envVars) {
      if (!(varName in envStatus)) {
        envStatus[varName] = Boolean(process.env[varName])
      }
    }
  }

  // Build per-tool availability: true if all required env vars are present
  const toolAvailability: Record<string, boolean> = {}
  for (const def of TOOL_CATALOG) {
    if (def.status === 'coming_soon') {
      toolAvailability[def.name] = false
      continue
    }
    if (!def.envVars || def.envVars.length === 0) {
      toolAvailability[def.name] = true
      continue
    }
    toolAvailability[def.name] = def.envVars.every((v) => envStatus[v])
  }

  return NextResponse.json({ toolAvailability, envStatus })
}
