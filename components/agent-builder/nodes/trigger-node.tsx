'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-primary bg-card px-4 py-3 shadow-sm min-w-40">
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{(data as Record<string, unknown>).label as string}</p>
          <p className="text-[10px] text-muted-foreground">Trigger</p>
        </div>
      </div>
    </div>
  )
}
