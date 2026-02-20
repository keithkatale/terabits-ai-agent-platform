'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function OutputNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-green-500/50 bg-card px-4 py-3 shadow-sm min-w-40">
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{(data as Record<string, unknown>).label as string}</p>
          <p className="text-[10px] text-muted-foreground">Output</p>
        </div>
      </div>
    </div>
  )
}
