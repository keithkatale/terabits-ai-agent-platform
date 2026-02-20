'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { TriggerConfig, InputFieldConfig, InputFieldType } from '@/lib/types/node-config'

interface TriggerConfigProps {
  config?: TriggerConfig
  nodeTypeKey: string  // Add this to know which trigger type
  onChange: (config: TriggerConfig) => void
  onClose: () => void
}

export function TriggerConfigPanel({ config, nodeTypeKey, onChange, onClose }: TriggerConfigProps) {
  // Determine trigger type from nodeTypeKey
  const triggerType = nodeTypeKey === 'button-trigger' ? 'button'
    : nodeTypeKey === 'input-form' ? 'input'
    : nodeTypeKey === 'schedule-trigger' ? 'schedule'
    : nodeTypeKey === 'webhook-trigger' ? 'webhook'
    : 'button'

  const [localConfig, setLocalConfig] = useState<any>(config || { type: triggerType })

  const handleSave = () => {
    onChange(localConfig)
    onClose()
  }

  const updateLocalConfig = (updates: any) => {
    setLocalConfig({ ...localConfig, ...updates })
  }

  // Get display name for trigger type
  const getTriggerDisplayName = () => {
    switch (nodeTypeKey) {
      case 'button-trigger': return 'Button Click'
      case 'input-form': return 'Input Form'
      case 'schedule-trigger': return 'Schedule'
      case 'webhook-trigger': return 'Webhook'
      default: return 'Trigger'
    }
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Configure Trigger</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getTriggerDisplayName()}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* No trigger type selector - directly show the config for this type */}
        
        {/* Button Configuration */}
        {triggerType === 'button' && (
          <ButtonTriggerConfig
            config={localConfig.type === 'button' ? localConfig : undefined}
            onChange={updateLocalConfig}
          />
        )}

        {/* Input Configuration */}
        {triggerType === 'input' && (
          <InputTriggerConfig
            config={localConfig.type === 'input' ? localConfig : undefined}
            onChange={updateLocalConfig}
          />
        )}

        {/* Schedule Configuration */}
        {triggerType === 'schedule' && (
          <ScheduleTriggerConfig
            config={localConfig.type === 'schedule' ? localConfig : undefined}
            onChange={updateLocalConfig}
          />
        )}

        {/* Webhook Configuration */}
        {triggerType === 'webhook' && (
          <WebhookTriggerConfig
            config={localConfig.type === 'webhook' ? localConfig : undefined}
            onChange={updateLocalConfig}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Configuration
        </Button>
      </div>
    </div>
  )
}

// Button Trigger Configuration
function ButtonTriggerConfig({ config, onChange }: { config?: any; onChange: (config: any) => void }) {
  const [buttonText, setButtonText] = useState(config?.buttonText || 'Run Agent')
  const [requireConfirmation, setRequireConfirmation] = useState(config?.requireConfirmation || false)
  const [confirmationMessage, setConfirmationMessage] = useState(config?.confirmationMessage || '')

  // Update parent whenever local state changes
  const updateParent = (updates: any) => {
    onChange({
      type: 'button',
      buttonText,
      requireConfirmation,
      confirmationMessage,
      ...updates
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Button Text</Label>
        <Input
          value={buttonText}
          onChange={(e) => {
            setButtonText(e.target.value)
            updateParent({ buttonText: e.target.value })
          }}
          placeholder="Run Agent"
        />
        <p className="text-xs text-muted-foreground">
          The text displayed on the button
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="require-confirmation"
          checked={requireConfirmation}
          onCheckedChange={(checked) => {
            setRequireConfirmation(checked as boolean)
            updateParent({ requireConfirmation: checked })
          }}
        />
        <Label htmlFor="require-confirmation" className="text-sm font-normal">
          Require confirmation before running
        </Label>
      </div>

      {requireConfirmation && (
        <div className="space-y-2">
          <Label>Confirmation Message</Label>
          <Textarea
            value={confirmationMessage}
            onChange={(e) => {
              setConfirmationMessage(e.target.value)
              updateParent({ confirmationMessage: e.target.value })
            }}
            placeholder="Are you sure you want to run this agent?"
            rows={3}
          />
        </div>
      )}
    </div>
  )
}

// Input Trigger Configuration
function InputTriggerConfig({ config, onChange }: { config?: any; onChange: (config: any) => void }) {
  const [fields, setFields] = useState<InputFieldConfig[]>(config?.fields || [])
  const [submitButtonText, setSubmitButtonText] = useState(config?.submitButtonText || 'Submit')

  // Update parent whenever fields or submit button changes
  const updateParent = (newFields?: InputFieldConfig[], newButtonText?: string) => {
    onChange({
      type: 'input',
      fields: newFields || fields,
      submitButtonText: newButtonText || submitButtonText
    })
  }

  const addField = () => {
    const newFields = [
      ...fields,
      {
        id: `field-${Date.now()}`,
        type: 'text' as InputFieldType,
        label: 'New Field',
        placeholder: '',
      },
    ]
    setFields(newFields)
    updateParent(newFields)
  }

  const removeField = (id: string) => {
    const newFields = fields.filter((f) => f.id !== id)
    setFields(newFields)
    updateParent(newFields)
  }

  const updateField = (id: string, updates: Partial<InputFieldConfig>) => {
    const newFields = fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    setFields(newFields)
    updateParent(newFields)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Input Fields</Label>
        <Button onClick={addField} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No input fields yet. Click "Add Field" to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <InputFieldEditor
              key={field.id}
              field={field}
              index={index}
              onUpdate={(updates) => updateField(field.id, updates)}
              onRemove={() => removeField(field.id)}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Submit Button Text</Label>
        <Input
          value={submitButtonText}
          onChange={(e) => {
            setSubmitButtonText(e.target.value)
            updateParent(undefined, e.target.value)
          }}
          placeholder="Submit"
        />
      </div>
    </div>
  )
}

// Input Field Editor
function InputFieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
}: {
  field: InputFieldConfig
  index: number
  onUpdate: (updates: Partial<InputFieldConfig>) => void
  onRemove: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Field Header */}
      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{field.label || `Field ${index + 1}`}</p>
          <p className="text-xs text-muted-foreground">{field.type}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Field Configuration */}
      {isExpanded && (
        <div className="border-t border-border p-3 space-y-3">
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select value={field.type} onValueChange={(value: InputFieldType) => onUpdate({ type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="password">Password</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="tel">Phone</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Field label"
            />
          </div>

          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>

          <div className="space-y-2">
            <Label>Help Text</Label>
            <Input
              value={field.helpText || ''}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="Optional help text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.validation?.required || false}
              onCheckedChange={(checked) =>
                onUpdate({
                  validation: { ...field.validation, required: checked as boolean },
                })
              }
            />
            <Label htmlFor={`required-${field.id}`} className="text-sm font-normal">
              Required field
            </Label>
          </div>

          {/* Type-specific validation */}
          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Min Length</Label>
                <Input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: { ...field.validation, minLength: parseInt(e.target.value) },
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Length</Label>
                <Input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: { ...field.validation, maxLength: parseInt(e.target.value) },
                    })
                  }
                  placeholder="∞"
                />
              </div>
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Min Value</Label>
                <Input
                  type="number"
                  value={field.validation?.min || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: { ...field.validation, min: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Value</Label>
                <Input
                  type="number"
                  value={field.validation?.max || ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: { ...field.validation, max: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
          )}

          {field.type === 'url' && (
            <div className="space-y-2">
              <Label>URL Pattern</Label>
              <Input
                value={field.validation?.pattern || ''}
                onChange={(e) =>
                  onUpdate({
                    validation: { ...field.validation, pattern: e.target.value },
                  })
                }
                placeholder="https?://.*"
              />
              <p className="text-xs text-muted-foreground">
                Regular expression pattern for URL validation
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Schedule Trigger Configuration
function ScheduleTriggerConfig({ config, onChange }: { config?: any; onChange: (config: TriggerConfig) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Schedule configuration coming soon...
      </p>
    </div>
  )
}

// Webhook Trigger Configuration
function WebhookTriggerConfig({ config, onChange }: { config?: any; onChange: (config: TriggerConfig) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Webhook configuration coming soon...
      </p>
    </div>
  )
}
