'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function ConditionNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-4 py-3 shadow-sm min-w-40">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-green-500 !w-2.5 !h-2.5 !left-1/3" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-destructive !w-2.5 !h-2.5 !left-2/3" />
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary-foreground">
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{(data as Record<string, unknown>).label as string}</p>
          <p className="text-[10px] text-muted-foreground">Condition</p>
        </div>
      </div>
    </div>
  )
}
