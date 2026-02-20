// Node Configuration Types

export type TriggerType = 'button' | 'input' | 'schedule' | 'webhook'

export type InputFieldType = 
  | 'text'
  | 'email'
  | 'password'
  | 'url'
  | 'number'
  | 'tel'
  | 'date'
  | 'time'
  | 'datetime'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'file'

export interface InputFieldValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  customValidation?: string
  errorMessage?: string
}

export interface InputFieldConfig {
  id: string
  type: InputFieldType
  label: string
  placeholder?: string
  helpText?: string
  defaultValue?: string | number | boolean
  validation?: InputFieldValidation
  options?: Array<{ label: string; value: string }> // For select/radio
  multiple?: boolean // For select/file
}

export interface ButtonTriggerConfig {
  type: 'button'
  buttonText: string
  buttonVariant?: 'default' | 'primary' | 'secondary' | 'destructive'
  confirmationMessage?: string
  requireConfirmation?: boolean
}

export interface InputTriggerConfig {
  type: 'input'
  fields: InputFieldConfig[]
  submitButtonText?: string
  layout?: 'vertical' | 'horizontal' | 'grid'
}

export interface ScheduleTriggerConfig {
  type: 'schedule'
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron'
    time?: string // HH:MM format
    dayOfWeek?: number[] // 0-6 (Sunday-Saturday)
    dayOfMonth?: number // 1-31
    cronExpression?: string
  }
}

export interface WebhookTriggerConfig {
  type: 'webhook'
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  authentication?: {
    type: 'none' | 'api-key' | 'bearer' | 'basic'
    headerName?: string
  }
  expectedPayload?: Record<string, any>
}

export type TriggerConfig = 
  | ButtonTriggerConfig
  | InputTriggerConfig
  | ScheduleTriggerConfig
  | WebhookTriggerConfig

// Processing Node Types
export type ProcessingNodeType =
  | 'web-scraper'
  | 'api-call'
  | 'data-transform'
  | 'ai-process'
  | 'filter'
  | 'condition'
  | 'loop'
  | 'delay'

export interface WebScraperConfig {
  type: 'web-scraper'
  url: string // Can include {{variable}} interpolation
  selector: string
  extractType: 'text' | 'html' | 'attribute' | 'multiple'
  attribute?: string
  multiple?: boolean
  waitForSelector?: boolean
  timeout?: number
}

export interface APICallConfig {
  type: 'api-call'
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: Record<string, any>
  authentication?: {
    type: 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth'
    credentials?: Record<string, string>
  }
  responseType?: 'json' | 'text' | 'blob'
}

export interface DataTransformConfig {
  type: 'data-transform'
  operation: 'map' | 'filter' | 'reduce' | 'sort' | 'group' | 'custom'
  script?: string // JavaScript code
  mapping?: Record<string, string>
}

export interface AIProcessConfig {
  type: 'ai-process'
  operation: 'summarize' | 'extract' | 'classify' | 'generate' | 'custom'
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface FilterConfig {
  type: 'filter'
  condition: string // JavaScript expression
  operator?: 'and' | 'or'
}

export interface ConditionConfig {
  type: 'condition'
  condition: string // JavaScript expression
  trueBranch?: string // Node ID
  falseBranch?: string // Node ID
}

export type ProcessingConfig =
  | WebScraperConfig
  | APICallConfig
  | DataTransformConfig
  | AIProcessConfig
  | FilterConfig
  | ConditionConfig

// Output Node Types
export type OutputNodeType =
  | 'text-display'
  | 'table-display'
  | 'json-display'
  | 'list-display'
  | 'chart-display'
  | 'download-button'
  | 'notification'

export interface TextDisplayConfig {
  type: 'text-display'
  title?: string
  format?: 'plain' | 'markdown' | 'html'
  template?: string // Template with {{variable}} interpolation
}

export interface TableDisplayConfig {
  type: 'table-display'
  title?: string
  columns: Array<{
    key: string
    label: string
    format?: 'text' | 'number' | 'date' | 'link' | 'badge'
  }>
  pagination?: boolean
  pageSize?: number
  sortable?: boolean
  searchable?: boolean
  downloadable?: boolean
}

export interface JSONDisplayConfig {
  type: 'json-display'
  title?: string
  collapsible?: boolean
  copyable?: boolean
}

export interface ListDisplayConfig {
  type: 'list-display'
  title?: string
  itemTemplate?: string // Template for each item
  emptyMessage?: string
}

export interface ChartDisplayConfig {
  type: 'chart-display'
  title?: string
  chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'area'
  xAxis?: string
  yAxis?: string
  dataKey?: string
}

export interface DownloadButtonConfig {
  type: 'download-button'
  buttonText?: string
  filename?: string
  format: 'json' | 'csv' | 'txt' | 'pdf'
}

export interface NotificationConfig {
  type: 'notification'
  notificationType: 'email' | 'sms' | 'webhook' | 'in-app'
  recipient?: string
  subject?: string
  template?: string
}

export type OutputConfig =
  | TextDisplayConfig
  | TableDisplayConfig
  | JSONDisplayConfig
  | ListDisplayConfig
  | ChartDisplayConfig
  | DownloadButtonConfig
  | NotificationConfig

// Enhanced Node Data
export interface EnhancedNodeData {
  label: string
  category: 'trigger' | 'processing' | 'output'
  config: TriggerConfig | ProcessingConfig | OutputConfig
  variables?: Record<string, any> // Runtime variables
}
