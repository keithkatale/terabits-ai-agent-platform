'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  Globe,
  Rss,
  Bell,
  Webhook,
  Mail,
  MessageSquare,
  Send,
  MessageCircle,
  Hash,
  Sparkles,
  AlignLeft,
  Tag,
  Languages,
  Table,
  Table2,
  Database,
  Users,
  ShoppingBag,
  CreditCard,
  Calendar,
  FileText,
  HardDrive,
  FileOutput,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import type { Agent } from '@/lib/types'
import {
  TOOL_CATALOG,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type ToolDefinition,
  type ToolCategory,
} from '@/lib/tools/catalog-metadata'

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Search,
  Globe,
  Rss,
  Bell,
  Webhook,
  Mail,
  MessageSquare,
  Send,
  MessageCircle,
  Hash,
  Sparkles,
  AlignLeft,
  Tag,
  Languages,
  Table,
  Table2,
  Database,
  Users,
  ShoppingBag,
  CreditCard,
  Calendar,
  FileText,
  HardDrive,
  FileOutput,
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Tool row ──────────────────────────────────────────────────────────────────

function ToolRow({
  def,
  enabled,
  missingEnvVars,
  saving,
  onToggle,
}: {
  def: ToolDefinition
  enabled: boolean
  missingEnvVars: string[]
  saving: boolean
  onToggle: (name: string, value: boolean) => void
}) {
  const Icon = ICON_MAP[def.icon] ?? Globe
  const isComingSoon = def.status === 'coming_soon'
  const hasMissingVars = missingEnvVars.length > 0

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
        isComingSoon
          ? 'border-border/50 bg-muted/20 opacity-60'
          : enabled
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-background hover:bg-muted/30'
      }`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          isComingSoon
            ? 'bg-muted text-muted-foreground'
            : enabled
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">{def.label}</span>
          {isComingSoon && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
          )}
          {!isComingSoon && hasMissingVars && (
            <span
              title={`Requires: ${missingEnvVars.join(', ')}`}
              className="flex items-center gap-0.5 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-600"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Config needed
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {def.description}
        </p>
        {!isComingSoon && hasMissingVars && (
          <p className="mt-1 text-[10px] text-yellow-600/80">
            Missing env vars: {missingEnvVars.join(', ')}
          </p>
        )}
      </div>

      {/* Control */}
      <div className="mt-0.5 shrink-0">
        {isComingSoon ? null : saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ToggleSwitch
            checked={enabled}
            onChange={(v) => onToggle(def.name, v)}
          />
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface ToolsPanelProps {
  agent: Agent
  onUpdate: (toolConfig: Record<string, { enabled?: boolean }>) => void
}

export function ToolsPanel({ agent, onUpdate }: ToolsPanelProps) {
  const [toolConfig, setToolConfig] = useState<Record<string, { enabled?: boolean }>>(
    (agent.tool_config as Record<string, { enabled?: boolean }>) ?? {}
  )
  const [savingTool, setSavingTool] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  // Map of toolName → missing env vars
  const [toolAvailability, setToolAvailability] = useState<Record<string, boolean>>({})
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({})

  // Fetch env var status once
  useEffect(() => {
    fetch('/api/tools/available')
      .then((r) => r.json())
      .then((data) => {
        if (data.toolAvailability) setToolAvailability(data.toolAvailability)
        if (data.envStatus) setEnvStatus(data.envStatus)
      })
      .catch(() => {
        // Silently ignore — UI will just not show warnings
      })
  }, [])

  const getMissingEnvVars = (def: ToolDefinition): string[] => {
    if (!def.envVars) return []
    return def.envVars.filter((v) => envStatus[v] === false)
  }

  const isEnabled = (name: string): boolean => {
    const def = TOOL_CATALOG.find((d) => d.name === name)
    if (!def) return false
    const config = toolConfig[name]
    return def.defaultEnabled ? config?.enabled !== false : config?.enabled === true
  }

  const handleToggle = async (toolName: string, value: boolean) => {
    const updated = {
      ...toolConfig,
      [toolName]: { enabled: value },
    }
    setToolConfig(updated)
    setSavingTool(toolName)
    setSaveSuccess(null)

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_config: updated }),
      })
      if (res.ok) {
        onUpdate(updated)
        setSaveSuccess(toolName)
        setTimeout(() => setSaveSuccess(null), 1500)
      }
    } catch {
      // Revert on failure
      setToolConfig(toolConfig)
    } finally {
      setSavingTool(null)
    }
  }

  const groupedTools = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = TOOL_CATALOG.filter((t) => t.category === cat)
      return acc
    },
    {} as Record<ToolCategory, ToolDefinition[]>
  )

  const enabledCount = TOOL_CATALOG.filter(
    (d) => d.status === 'available' && isEnabled(d.name)
  ).length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Agent Tools</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Choose which tools this agent can use when running tasks
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <CheckCircle2 className="h-3 w-3" />
            {enabledCount} active
          </div>
        </div>
      </div>

      {/* Tool list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {CATEGORY_ORDER.map((category) => {
            const tools = groupedTools[category]
            if (!tools.length) return null
            return (
              <section key={category}>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {CATEGORY_LABELS[category]}
                </h4>
                <div className="space-y-1.5">
                  {tools.map((def) => (
                    <ToolRow
                      key={def.name}
                      def={def}
                      enabled={isEnabled(def.name)}
                      missingEnvVars={getMissingEnvVars(def)}
                      saving={savingTool === def.name}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="shrink-0 border-t border-border px-4 py-2.5">
        <p className="text-[10px] text-muted-foreground">
          Changes take effect on the next run.{' '}
          <span className="text-yellow-600">Config needed</span> = env var required from platform admin.
        </p>
      </div>
    </div>
  )
}
