// Public shared table page.
// Reads encoded table data from ?d= query param (base64 JSON).
// No auth required.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TableShareView } from '@/components/runtime/table-share-view'

interface PageProps {
  searchParams: Promise<{ d?: string }>
}

function decodeTableData(encoded: string): { heading: string | null; data: string[][] } | null {
  try {
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.data)) return null
    return { heading: parsed.heading ?? null, data: parsed.data }
  } catch {
    return null
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { d: encoded } = await searchParams
  if (!encoded) return { title: 'Shared Table' }
  const payload = decodeTableData(encoded)
  return {
    title: payload?.heading ? `${payload.heading} — Table` : 'Shared Table',
  }
}

export default async function ShareTablePage({ searchParams }: PageProps) {
  const { d: encoded } = await searchParams
  if (!encoded) notFound()

  const payload = decodeTableData(encoded)
  if (!payload || !payload.data.length) notFound()

  return <TableShareView heading={payload.heading} data={payload.data} />
}
