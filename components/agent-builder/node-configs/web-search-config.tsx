'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface WebSearchConfigProps {
  config: any
  onChange: (config: any) => void
}

export function WebSearchConfig({ config, onChange }: WebSearchConfigProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Search Query</Label>
        <Textarea
          value={config.query || ''}
          onChange={(e) => updateConfig('query', e.target.value)}
          placeholder="Enter search query or use {{variable}}"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Use {'{{nodeId.field}}'} to reference data from previous nodes
        </p>
      </div>

      <div className="space-y-2">
        <Label>Search Type</Label>
        <Select 
          value={config.type || 'search'} 
          onValueChange={(value) => updateConfig('type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="search">Web Search</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="images">Images</SelectItem>
            <SelectItem value="places">Places</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Number of Results</Label>
        <Input
          type="number"
          value={config.numResults || 10}
          onChange={(e) => updateConfig('numResults', parseInt(e.target.value))}
          min={1}
          max={100}
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of search results to return (1-100)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Location (Optional)</Label>
        <Input
          value={config.location || ''}
          onChange={(e) => updateConfig('location', e.target.value)}
          placeholder="e.g., us, uk, ca"
        />
        <p className="text-xs text-muted-foreground">
          Two-letter country code for localized results
        </p>
      </div>

      <div className="space-y-2">
        <Label>Language (Optional)</Label>
        <Input
          value={config.language || ''}
          onChange={(e) => updateConfig('language', e.target.value)}
          placeholder="e.g., en, es, fr"
        />
        <p className="text-xs text-muted-foreground">
          Two-letter language code for results
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Output Variables</p>
        <p className="text-xs text-muted-foreground">
          This node will output:
        </p>
        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <li>• <code className="text-foreground">{'{{thisNode.results}}'}</code> - Array of search results</li>
          <li>• <code className="text-foreground">{'{{thisNode.total}}'}</code> - Total number of results</li>
        </ul>
      </div>
    </div>
  )
}
