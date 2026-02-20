'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function SkillNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm min-w-40">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-foreground">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{(data as Record<string, unknown>).label as string}</p>
          <p className="text-[10px] text-muted-foreground">{(data as Record<string, unknown>).skillType as string ?? 'Skill'}</p>
        </div>
      </div>
    </div>
  )
}
