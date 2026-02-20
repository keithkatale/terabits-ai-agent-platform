'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface DisplayTableConfigProps {
  config: any
  onChange: (config: any) => void
}

interface Column {
  key: string
  label: string
  format: 'text' | 'number' | 'date' | 'link' | 'badge'
}

export function DisplayTableConfig({ config, onChange }: DisplayTableConfigProps) {
  const [columns, setColumns] = useState<Column[]>(config.columns || [])

  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  const addColumn = () => {
    const newColumns = [...columns, { key: '', label: '', format: 'text' as const }]
    setColumns(newColumns)
    updateConfig('columns', newColumns)
  }

  const removeColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index)
    setColumns(newColumns)
    updateConfig('columns', newColumns)
  }

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setColumns(newColumns)
    updateConfig('columns', newColumns)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Table Title</Label>
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="Results Table"
        />
      </div>

      <div className="space-y-2">
        <Label>Data Source</Label>
        <Input
          value={config.data || ''}
          onChange={(e) => updateConfig('data', e.target.value)}
          placeholder="{{nodeId.results}}"
        />
        <p className="text-xs text-muted-foreground">
          Reference to array data from a previous node
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Columns</Label>
          <Button
            onClick={addColumn}
            size="sm"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Column
          </Button>
        </div>
        
        {columns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No columns. Click "Add Column" to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Column {index + 1}</p>
                  <Button
                    onClick={() => removeColumn(index)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Input
                      value={column.key}
                      onChange={(e) => updateColumn(index, 'key', e.target.value)}
                      placeholder="fieldName"
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={column.label}
                      onChange={(e) => updateColumn(index, 'label', e.target.value)}
                      placeholder="Display Name"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Format</Label>
                  <Select 
                    value={column.format} 
                    onValueChange={(value) => updateColumn(index, 'format', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="badge">Badge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Table Features</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pagination"
            checked={config.pagination || false}
            onCheckedChange={(checked) => updateConfig('pagination', checked)}
          />
          <Label htmlFor="pagination" className="text-sm font-normal">
            Enable pagination
          </Label>
        </div>

        {config.pagination && (
          <div className="ml-6 space-y-2">
            <Label className="text-xs">Page Size</Label>
            <Input
              type="number"
              value={config.pageSize || 25}
              onChange={(e) => updateConfig('pageSize', parseInt(e.target.value))}
              min={1}
              max={100}
              className="h-8 text-xs"
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="sortable"
            checked={config.sortable || false}
            onCheckedChange={(checked) => updateConfig('sortable', checked)}
          />
          <Label htmlFor="sortable" className="text-sm font-normal">
            Enable sorting
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="searchable"
            checked={config.searchable || false}
            onCheckedChange={(checked) => updateConfig('searchable', checked)}
          />
          <Label htmlFor="searchable" className="text-sm font-normal">
            Enable search
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="downloadable"
            checked={config.downloadable || false}
            onCheckedChange={(checked) => updateConfig('downloadable', checked)}
          />
          <Label htmlFor="downloadable" className="text-sm font-normal">
            Enable download (CSV/JSON)
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Empty Message</Label>
        <Input
          value={config.emptyMessage || ''}
          onChange={(e) => updateConfig('emptyMessage', e.target.value)}
          placeholder="No data to display"
        />
        <p className="text-xs text-muted-foreground">
          Message shown when table has no data
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Preview</p>
        <p className="text-xs text-muted-foreground">
          This table will display data from <code className="text-foreground">{config.data || '{{nodeId.results}}'}</code>
        </p>
        {columns.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Columns:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {columns.map((col, i) => (
                col.key && col.label && (
                  <li key={i}>• {col.label} ({col.format})</li>
                )
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
