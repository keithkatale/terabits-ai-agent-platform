CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT DEFAULT 'draft',
  system_prompt TEXT,
  model TEXT DEFAULT 'gemini-2.5-pro-preview',
  settings JSONB DEFAULT '{}',
  deploy_slug TEXT UNIQUE,
  is_deployed BOOLEAN DEFAULT false,
  conversation_phase TEXT DEFAULT 'discovery',
  capabilities JSONB DEFAULT '[]',
  limitations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_select_own' AND tablename = 'agents') THEN
    CREATE POLICY "agents_select_own" ON public.agents FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_insert_own' AND tablename = 'agents') THEN
    CREATE POLICY "agents_insert_own" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_update_own' AND tablename = 'agents') THEN
    CREATE POLICY "agents_update_own" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_delete_own' AND tablename = 'agents') THEN
    CREATE POLICY "agents_delete_own" ON public.agents FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
