# AI usage and token calculation

This folder provides helpers so the platform calculates **token usage** consistently for credits and `execution_logs`.

## Why this exists

- The **Vercel AI SDK** (and thus Gemini) exposes usage as `inputTokens` / `outputTokens` / `totalTokens`, not `promptTokens` / `completionTokens`.
- Multi-step runs (e.g. with tools) can emit multiple `finish` parts; the **aggregated** usage is on `result.totalUsage` or in `onFinish({ totalUsage })`.

## Usage

### 1. After consuming `streamText` fullStream

```ts
import { normalizeUsage, addUsage } from '@/lib/ai/usage'

let accumulatedUsage = normalizeUsage(undefined)
for await (const part of result.fullStream) {
  if (part.type === 'finish') {
    if ((part as any).totalUsage != null) {
      accumulatedUsage = normalizeUsage((part as any).totalUsage)
    } else {
      accumulatedUsage = addUsage(accumulatedUsage, (part as any).usage)
    }
  }
}
// Prefer result.totalUsage when available
let usage = accumulatedUsage
try {
  const totalUsage = await Promise.resolve((result as any).totalUsage)
  if (totalUsage && (totalUsage.totalTokens ?? (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0)) > 0) {
    usage = normalizeUsage(totalUsage)
  }
} catch { /* use accumulatedUsage */ }

// Then: usage.promptTokens, usage.completionTokens, usage.totalTokens
```

### 2. Using `onFinish` (e.g. when returning a stream and not consuming it yourself)

```ts
import { normalizeUsage } from '@/lib/ai/usage'

streamText({
  model: google('gemini-3-flash-preview'),
  messages,
  onFinish: async ({ totalUsage }) => {
    const usage = normalizeUsage(totalUsage as any)
    await supabase.from('execution_logs').update({
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      // ...
    }).eq('id', logId)
  },
})
```

### 3. With `generateText` (non-streaming)

```ts
const result = await generateText({ model, messages, ... })
const usage = normalizeUsage(result.usage as any)
// result has .usage (and possibly .totalUsage for multi-step)
```

## Where tokens are used

- **Execute routes** (`/api/agents/[id]/execute`, `/api/public/[slug]/execute`): Capture usage from stream + `result.totalUsage`, persist to `execution_logs`, call `useTokenCredits()` for credit deduction.
- **Run route** (`/api/agents/[id]/run`): Capture usage in `onFinish({ totalUsage })`, persist to `execution_logs` (no credit deduction on this path).
- **Credits**: `lib/payments/use-token-credits.ts` and `token-to-credit-converter.ts` use `promptTokens` / `completionTokens`; always pass the **normalized** `usage` from this module.

## Pricing

Model pricing is in the `token_pricing` table (see migration). Ensure the model name you pass to `useTokenCredits` / `tokenConverter.calculateCredits` matches a row (e.g. `gemini-3-flash-preview`).
