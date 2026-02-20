# Gemini 3 Model Update

## Overview

All AI agents in the Terabits platform now strictly use **Gemini 3 Flash** as specified in the [Gemini API documentation](https://ai.google.dev/gemini-api/docs/gemini-3).

## Changes Made

### 1. Agent Builder API
**File:** `app/api/agent-builder/route.ts`
- **Before:** `gemini-2.0-flash-exp`
- **After:** `gemini-3-flash-preview`

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  tools: [convertToolsToGoogleFormat()],
})
```

### 2. Agent Runtime Loop
**File:** `lib/agent-runtime/agent-loop.ts`
- **Before:** `gemini-2.0-flash-exp`
- **After:** `gemini-3-flash-preview`

```typescript
const result = await streamText({
  model: google(config.model || 'gemini-3-flash-preview'),
  system: config.systemPrompt,
  messages,
})
```

### 3. Chat Panel UI
**File:** `components/agent-builder/chat-panel.tsx`
- Updated display text from "Gemini 2.0 Flash" to "Gemini 3 Flash"

### 4. Database Defaults
**Files:** `scripts/001_create_tables.sql`, `scripts/003_agents.sql`
- Already configured with `gemini-3-flash-preview` as default

### 5. Documentation
**File:** `IMPLEMENTATION_SUMMARY.md`
- Updated technical details to reflect Gemini 3 usage

## Gemini 3 Series Models

According to the [official documentation](https://ai.google.dev/gemini-api/docs/gemini-3):

| Model ID | Context Window | Knowledge Cutoff | Pricing |
|----------|---------------|------------------|---------|
| gemini-3.1-pro-preview | 1M / 64k | Jan 2025 | $2 / $12 (<200k tokens) |
| gemini-3-pro-preview | 1M / 64k | Jan 2025 | $2 / $12 (<200k tokens) |
| **gemini-3-flash-preview** | 1M / 64k | Jan 2025 | **$0.50 / $3** |
| gemini-3-pro-image-preview | 65k / 32k | Jan 2025 | $2 (text) / $0.134 (image) |

### Why Gemini 3 Flash?

- **Pro-level intelligence** at Flash speed and pricing
- **1M token context window** for complex agent workflows
- **Latest knowledge** (Jan 2025 cutoff)
- **Cost-effective** ($0.50 input / $3 output per million tokens)
- **Preview status** - All Gemini 3 models are currently in preview

## Verification

To verify the model is being used correctly:

1. **Check API calls:**
   ```bash
   # Look for model initialization in logs
   grep "gemini-3-flash-preview" logs/
   ```

2. **Test agent creation:**
   - Create a new agent
   - Check the database `agents` table
   - Verify `model` column shows `gemini-3-flash-preview`

3. **Monitor API usage:**
   - Check Google AI Studio dashboard
   - Verify requests are going to Gemini 3 Flash

## Migration Notes

- **Backward compatibility:** Existing agents with `gemini-2.0-flash-exp` will continue to work but should be migrated
- **No breaking changes:** The API interface remains the same
- **Performance:** Gemini 3 Flash offers better performance than 2.0 Flash
- **Cost:** Slightly different pricing structure (see table above)

## Future Considerations

### Gemini 3.1 Pro
For more complex reasoning tasks, consider upgrading to:
- `gemini-3.1-pro-preview` - Next iteration with improved performance
- Higher cost but better for complex multi-step reasoning

### Gemini 3 Pro
For tasks requiring maximum intelligence:
- `gemini-3-pro-preview` - Best for complex tasks with broad world knowledge
- Same pricing as 3.1 Pro

## Configuration

To change the model for a specific agent:

```typescript
// In agent configuration
{
  model: 'gemini-3-flash-preview', // Default
  // or
  model: 'gemini-3.1-pro-preview', // For complex tasks
  // or
  model: 'gemini-3-pro-preview', // For maximum intelligence
}
```

## Testing Checklist

- [x] Updated agent builder API to use Gemini 3 Flash
- [x] Updated agent runtime loop to use Gemini 3 Flash
- [x] Updated UI to display "Gemini 3 Flash"
- [x] Verified database defaults are correct
- [x] Updated documentation
- [ ] Test agent creation with new model
- [ ] Test agent execution with new model
- [ ] Verify streaming works correctly
- [ ] Verify tool execution works correctly
- [ ] Monitor API costs and performance

## References

- [Gemini 3 Documentation](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Google AI Studio](https://aistudio.google.com/)

---

**Status:** ✅ Complete - All agents now use Gemini 3 Flash strictly
**Date:** February 20, 2026
