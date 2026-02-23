'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutTemplate, Loader2 } from 'lucide-react'
import {
  AGENT_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  type AgentTemplate,
} from '@/lib/agent-catalog'
import type { Agent } from '@/lib/types'

interface TemplateSelectProps {
  agent: Agent
  onAgentUpdate: (updates: Partial<Agent>) => void
}

export function TemplateSelect({ agent, onAgentUpdate }: TemplateSelectProps) {
  const [loading, setLoading] = useState(false)

  const applyTemplate = async (template: AgentTemplate) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          category: template.category,
          instruction_prompt: template.instructionPrompt,
          tool_config: template.toolConfig,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onAgentUpdate({
          name: data.name,
          description: data.description,
          category: data.category,
          instruction_prompt: data.instruction_prompt,
          tool_config: data.tool_config,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LayoutTemplate className="h-3.5 w-3.5" />
          )}
          Start from template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Prefill name, instructions, and tools
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {AGENT_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => applyTemplate(template)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="font-medium text-foreground">{template.name}</span>
            <span className="text-[11px] text-muted-foreground line-clamp-2">
              {template.description}
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              {TEMPLATE_CATEGORY_LABELS[template.category]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
