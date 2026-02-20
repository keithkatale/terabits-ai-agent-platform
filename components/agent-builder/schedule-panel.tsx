'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react'
import type { AgentSchedule } from '@/lib/types'

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Weekdays at 9am', value: '0 9 * * 1-5' },
  { label: 'Weekly (Monday)', value: '0 9 * * 1' },
  { label: 'Monthly (1st)', value: '0 9 1 * *' },
]

interface SchedulePanelProps {
  agentId: string
}

export function SchedulePanel({ agentId }: SchedulePanelProps) {
  const [schedules, setSchedules] = useState<AgentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCron, setFormCron] = useState('0 9 * * *')
  const [saving, setSaving] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/schedules`)
      if (res.ok) {
        const data = await res.json()
        setSchedules(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCron.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          cron_expression: formCron,
          task_list: [],
        }),
      })

      if (res.ok) {
        setFormName('')
        setFormDescription('')
        setFormCron('0 9 * * *')
        setShowForm(false)
        fetchSchedules()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (schedule: AgentSchedule) => {
    await fetch(`/api/agents/${agentId}/schedules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule_id: schedule.id,
        is_active: !schedule.is_active,
      }),
    })
    fetchSchedules()
  }

  const handleDelete = async (scheduleId: string) => {
    await fetch(`/api/agents/${agentId}/schedules?schedule_id=${scheduleId}`, {
      method: 'DELETE',
    })
    fetchSchedules()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Schedules</h3>
          <p className="text-xs text-muted-foreground">
            Automate your AI employee with recurring tasks.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border bg-card p-4 space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-foreground">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Daily report generation"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Description</label>
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Frequency</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setFormCron(preset.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    formCron === preset.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              value={formCron}
              onChange={(e) => setFormCron(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {schedules.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No schedules yet</p>
          <p className="text-xs text-muted-foreground">
            Create a schedule to automate your AI employee.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{schedule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">
                      {schedule.cron_expression}
                    </code>
                    {schedule.description && (
                      <span className="ml-2">{schedule.description}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={schedule.is_active ? 'default' : 'secondary'}
                  className={`cursor-pointer ${schedule.is_active ? 'bg-emerald-600 text-white' : ''}`}
                  onClick={() => handleToggle(schedule)}
                >
                  {schedule.is_active ? 'Active' : 'Paused'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(schedule.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Delete schedule</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
