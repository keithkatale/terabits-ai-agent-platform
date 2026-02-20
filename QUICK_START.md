# Quick Start - Get Running in 5 Minutes

## 1. Run Migrations (2 minutes)

Open Supabase SQL Editor → Copy/paste these files → Click Run:

1. `supabase/migrations/20240222_execution_system_clean.sql`
2. `supabase/migrations/20240222_ensure_messages_table.sql`

## 2. Start Server (1 minute)

```bash
cd terabits-ai-agent-platform
npm run dev
```

## 3. Test (2 minutes)

1. Go to http://localhost:3000/dashboard
2. Create new agent
3. Say: "Create a Reddit lead finder"
4. Approve the plan
5. Watch nodes appear on canvas
6. Click "Run Agent"
7. Test execution

## Done! 🎉

If it works:
- ✅ Messages persist
- ✅ Workflow builds
- ✅ Execution works

If it doesn't work:
- Check `TEST_INSTRUCTIONS.md` for detailed debugging
- Check browser console for errors
- Check Supabase for data

## What Changed

- **API**: Now uses Vercel AI SDK (proper tool execution)
- **Chat**: Now uses `useChat` hook (proper streaming)
- **Database**: Messages persist, execution system ready

## Files Changed

- `app/api/agent-builder/route.ts` - Replaced
- `components/agent-builder/chat-panel.tsx` - Replaced
- `components/agent-builder/agent-execution-view.tsx` - Updated
- `components/agent-builder/agent-builder.tsx` - Updated

Old versions backed up as `-old.tsx` files.

## Rollback

If broken:
```bash
mv app/api/agent-builder/route-old.ts app/api/agent-builder/route.ts
mv components/agent-builder/chat-panel-old.tsx components/agent-builder/chat-panel.tsx
```

## Read More

- `COMPLETE_FIX_SUMMARY.md` - Full technical details
- `TEST_INSTRUCTIONS.md` - Detailed testing steps
- `NEW_UX_ARCHITECTURE.md` - UX design overview
