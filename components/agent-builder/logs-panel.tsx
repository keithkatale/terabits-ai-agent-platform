'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, Activity } from 'lucide-react'
import type { ExecutionLog } from '@/lib/types'

interface LogsPanelProps {
  agentId: string
}

export function LogsPanel({ agentId }: LogsPanelProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/logs?limit=50`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
      case 'deployed':
        return 'bg-emerald-600 text-white'
      case 'running':
        return 'bg-blue-600 text-white'
      case 'error':
        return 'bg-destructive text-destructive-foreground'
      case 'undeployed':
        return 'bg-amber-600 text-white'
      default:
        return ''
    }
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Execution Logs</h3>
          <p className="text-xs text-muted-foreground">
            Track every interaction and event for your AI employee.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Logs will appear here as your AI employee runs.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Started
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Completed
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">
                      {formatTime(log.started_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">
                      {formatTime(log.completed_at)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-xs text-muted-foreground">
                      {log.error
                        ? log.error
                        : log.input
                          ? JSON.stringify(log.input).slice(0, 100)
                          : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
