'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'

interface AITextConfigProps {
  config: any
  onChange: (config: any) => void
}

export function AITextConfig({ config, onChange }: AITextConfigProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select 
          value={config.model || 'gemini-3-flash-preview'} 
          onValueChange={(value) => updateConfig('model', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash (Recommended)</SelectItem>
            <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          All agents use Gemini 3 models exclusively
        </p>
      </div>

      <div className="space-y-2">
        <Label>Operation Type</Label>
        <Select 
          value={config.operation || 'custom'} 
          onValueChange={(value) => updateConfig('operation', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summarize">Summarize</SelectItem>
            <SelectItem value="extract">Extract Information</SelectItem>
            <SelectItem value="classify">Classify</SelectItem>
            <SelectItem value="generate">Generate Content</SelectItem>
            <SelectItem value="custom">Custom Prompt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea
          value={config.prompt || ''}
          onChange={(e) => updateConfig('prompt', e.target.value)}
          placeholder="Enter your prompt here. Use {{variable}} to reference data from previous nodes."
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          Use {'{{nodeId.field}}'} to reference data from previous nodes
        </p>
      </div>

      <div className="space-y-2">
        <Label>Temperature: {config.temperature || 0.7}</Label>
        <Slider
          value={[config.temperature || 0.7]}
          onValueChange={([value]) => updateConfig('temperature', value)}
          min={0}
          max={2}
          step={0.1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Lower = more focused, Higher = more creative (0-2)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Max Tokens</Label>
        <Input
          type="number"
          value={config.maxTokens || 1000}
          onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
          min={1}
          max={8192}
        />
        <p className="text-xs text-muted-foreground">
          Maximum length of the AI response (1-8192)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Output Format</Label>
        <Select 
          value={config.outputFormat || 'text'} 
          onValueChange={(value) => updateConfig('outputFormat', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Plain Text</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Example Prompts</p>
        <div className="space-y-2 mt-2">
          <button
            onClick={() => updateConfig('prompt', 'Summarize this text in 3-5 sentences:\n\n{{previousNode.text}}')}
            className="w-full text-left text-xs p-2 rounded border border-border hover:bg-accent transition-colors"
          >
            Summarize text
          </button>
          <button
            onClick={() => updateConfig('prompt', 'Extract all email addresses and phone numbers from this text:\n\n{{previousNode.text}}\n\nReturn as JSON array.')}
            className="w-full text-left text-xs p-2 rounded border border-border hover:bg-accent transition-colors"
          >
            Extract contact info
          </button>
          <button
            onClick={() => updateConfig('prompt', 'Classify this text into one of these categories: [positive, negative, neutral]\n\nText: {{previousNode.text}}\n\nReturn only the category name.')}
            className="w-full text-left text-xs p-2 rounded border border-border hover:bg-accent transition-colors"
          >
            Classify sentiment
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Output Variables</p>
        <p className="text-xs text-muted-foreground">
          This node will output:
        </p>
        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <li>• <code className="text-foreground">{'{{thisNode.text}}'}</code> - AI generated text</li>
          <li>• <code className="text-foreground">{'{{thisNode.model}}'}</code> - Model used</li>
          <li>• <code className="text-foreground">{'{{thisNode.tokensUsed}}'}</code> - Tokens consumed</li>
        </ul>
      </div>
    </div>
  )
}
