CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'builder',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_select_own' AND tablename = 'messages') THEN
    CREATE POLICY "messages_select_own" ON public.messages FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_insert_own' AND tablename = 'messages') THEN
    CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_delete_own' AND tablename = 'messages') THEN
    CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memory_select_own' AND tablename = 'agent_memory') THEN
    CREATE POLICY "memory_select_own" ON public.agent_memory FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memory_insert_own' AND tablename = 'agent_memory') THEN
    CREATE POLICY "memory_insert_own" ON public.agent_memory FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memory_update_own' AND tablename = 'agent_memory') THEN
    CREATE POLICY "memory_update_own" ON public.agent_memory FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memory_delete_own' AND tablename = 'agent_memory') THEN
    CREATE POLICY "memory_delete_own" ON public.agent_memory FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;
