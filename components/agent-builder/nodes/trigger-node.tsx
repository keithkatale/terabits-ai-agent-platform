"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Zap } from "lucide-react"

interface TriggerNodeData {
  label: string
  description: string
  nodeType: string
  config?: Record<string, unknown>
}

export function TriggerNode({ data }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData
  return (
    <div className="group relative min-w-[200px] max-w-[260px] rounded-lg border border-blue-500/25 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 rounded-t-lg border-b border-blue-500/15 bg-blue-500/8 px-3 py-2">
        <Zap className="h-3.5 w-3.5 shrink-0 text-blue-600" />
        <span className="truncate text-[13px] font-semibold text-blue-600">
          {nodeData.label}
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {nodeData.description}
        </p>
        {nodeData.config && Object.keys(nodeData.config).length > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(nodeData.config).slice(0, 3).map(([key, value]) => (
              <div key={key} className="text-[10px]">
                <span className="font-medium text-foreground">{key}:</span>{" "}
                <span className="text-muted-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-blue-500 !bg-card"
      />
    </div>
  )
}
