'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface WebScraperConfigProps {
  config: any
  onChange: (config: any) => void
}

interface Selector {
  name: string
  selector: string
  type: 'text' | 'html' | 'attribute'
  attribute?: string
}

export function WebScraperConfig({ config, onChange }: WebScraperConfigProps) {
  const [selectors, setSelectors] = useState<Selector[]>(config.selectors || [])

  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  const addSelector = () => {
    const newSelectors = [...selectors, { name: '', selector: '', type: 'text' as const }]
    setSelectors(newSelectors)
    updateConfig('selectors', newSelectors)
  }

  const removeSelector = (index: number) => {
    const newSelectors = selectors.filter((_, i) => i !== index)
    setSelectors(newSelectors)
    updateConfig('selectors', newSelectors)
  }

  const updateSelector = (index: number, field: keyof Selector, value: any) => {
    const newSelectors = [...selectors]
    newSelectors[index] = { ...newSelectors[index], [field]: value }
    setSelectors(newSelectors)
    updateConfig('selectors', newSelectors)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>URL to Scrape</Label>
        <Input
          value={config.url || ''}
          onChange={(e) => updateConfig('url', e.target.value)}
          placeholder="https://example.com or {{variable}}"
        />
        <p className="text-xs text-muted-foreground">
          Use {'{{nodeId.field}}'} to reference URLs from previous nodes
        </p>
      </div>

      <div className="space-y-2">
        <Label>Scraping Method</Label>
        <Select 
          value={config.method || 'cheerio'} 
          onValueChange={(value) => updateConfig('method', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cheerio">Cheerio (Fast, Static)</SelectItem>
            <SelectItem value="playwright">Playwright (Slow, Dynamic)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Cheerio for static pages, Playwright for JavaScript-heavy sites
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>CSS Selectors</Label>
          <Button
            onClick={addSelector}
            size="sm"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Selector
          </Button>
        </div>
        
        {selectors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No selectors. Click "Add Selector" to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectors.map((selector, index) => (
              <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Selector {index + 1}</p>
                  <Button
                    onClick={() => removeSelector(index)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Input
                    value={selector.name}
                    onChange={(e) => updateSelector(index, 'name', e.target.value)}
                    placeholder="Field name (e.g., title)"
                  />
                  
                  <Input
                    value={selector.selector}
                    onChange={(e) => updateSelector(index, 'selector', e.target.value)}
                    placeholder="CSS selector (e.g., h1.title)"
                  />
                  
                  <Select 
                    value={selector.type} 
                    onValueChange={(value) => updateSelector(index, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Content</SelectItem>
                      <SelectItem value="html">HTML Content</SelectItem>
                      <SelectItem value="attribute">Attribute Value</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {selector.type === 'attribute' && (
                    <Input
                      value={selector.attribute || ''}
                      onChange={(e) => updateSelector(index, 'attribute', e.target.value)}
                      placeholder="Attribute name (e.g., href, src)"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Wait For Selector (Optional)</Label>
        <Input
          value={config.waitFor || ''}
          onChange={(e) => updateConfig('waitFor', e.target.value)}
          placeholder="CSS selector to wait for"
        />
        <p className="text-xs text-muted-foreground">
          Wait for this element to appear before scraping (Playwright only)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Timeout (seconds)</Label>
        <Input
          type="number"
          value={config.timeout || 30}
          onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
          min={1}
          max={300}
        />
        <p className="text-xs text-muted-foreground">
          Maximum time to wait for page load (1-300 seconds)
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">CSS Selector Tips</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <code className="text-foreground">h1</code> - Select by tag</li>
          <li>• <code className="text-foreground">.class-name</code> - Select by class</li>
          <li>• <code className="text-foreground">#id</code> - Select by ID</li>
          <li>• <code className="text-foreground">div.container p</code> - Nested selection</li>
          <li>• <code className="text-foreground">a[href]</code> - Select with attribute</li>
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Output Variables</p>
        <p className="text-xs text-muted-foreground">
          This node will output an object with your selector names as keys:
        </p>
        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {selectors.map((selector, index) => (
            selector.name && (
              <li key={index}>• <code className="text-foreground">{`{{thisNode.${selector.name}}}`}</code></li>
            )
          ))}
        </ul>
      </div>
    </div>
  )
}
