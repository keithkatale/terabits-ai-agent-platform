'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface ApifyActorConfigProps {
  config: any
  onChange: (config: any) => void
}

export function ApifyActorConfig({ config, onChange }: ApifyActorConfigProps) {
  const [inputFields, setInputFields] = useState<Array<{ key: string; value: string }>>(
    config.input ? Object.entries(config.input).map(([key, value]) => ({ key, value: value as string })) : []
  )

  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  const addInputField = () => {
    setInputFields([...inputFields, { key: '', value: '' }])
  }

  const removeInputField = (index: number) => {
    const newFields = inputFields.filter((_, i) => i !== index)
    setInputFields(newFields)
    updateInputFromFields(newFields)
  }

  const updateInputField = (index: number, field: 'key' | 'value', newValue: string) => {
    const newFields = [...inputFields]
    newFields[index][field] = newValue
    setInputFields(newFields)
    updateInputFromFields(newFields)
  }

  const updateInputFromFields = (fields: Array<{ key: string; value: string }>) => {
    const inputObj = fields.reduce((acc, field) => {
      if (field.key) {
        acc[field.key] = field.value
      }
      return acc
    }, {} as Record<string, string>)
    updateConfig('input', inputObj)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Actor ID</Label>
        <Input
          value={config.actorId || ''}
          onChange={(e) => updateConfig('actorId', e.target.value)}
          placeholder="e.g., apify/youtube-scraper"
        />
        <p className="text-xs text-muted-foreground">
          The Apify actor identifier (username/actor-name)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Actor Input</Label>
          <Button
            onClick={addInputField}
            size="sm"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Field
          </Button>
        </div>
        
        {inputFields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No input fields. Click "Add Field" to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {inputFields.map((field, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={field.key}
                  onChange={(e) => updateInputField(index, 'key', e.target.value)}
                  placeholder="Key"
                  className="flex-1"
                />
                <Input
                  value={field.value}
                  onChange={(e) => updateInputField(index, 'value', e.target.value)}
                  placeholder="Value or {{variable}}"
                  className="flex-1"
                />
                <Button
                  onClick={() => removeInputField(index)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Configure the input parameters for the Apify actor. Use {'{{variable}}'} syntax to reference previous nodes.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Memory (MB)</Label>
        <Input
          type="number"
          value={config.memory || 256}
          onChange={(e) => updateConfig('memory', parseInt(e.target.value))}
          min={128}
          max={32768}
        />
        <p className="text-xs text-muted-foreground">
          Memory allocated for the actor run (128-32768 MB)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Timeout (seconds)</Label>
        <Input
          type="number"
          value={config.timeout || 300}
          onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
          min={1}
          max={3600}
        />
        <p className="text-xs text-muted-foreground">
          Maximum time to wait for actor completion (1-3600 seconds)
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Output Variables</p>
        <p className="text-xs text-muted-foreground">
          This node will output:
        </p>
        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <li>• <code className="text-foreground">{'{{thisNode.data}}'}</code> - Actor output data</li>
          <li>• <code className="text-foreground">{'{{thisNode.runId}}'}</code> - Apify run ID</li>
          <li>• <code className="text-foreground">{'{{thisNode.duration}}'}</code> - Execution duration</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">API Key Required</p>
        <p className="text-xs text-muted-foreground">
          Make sure APIFY_API_KEY is set in your environment variables.
        </p>
      </div>
    </div>
  )
}
