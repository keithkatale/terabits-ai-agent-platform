CREATE TABLE IF NOT EXISTS public.agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  task_list JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'schedules_select_own' AND tablename = 'agent_schedules') THEN
    CREATE POLICY "schedules_select_own" ON public.agent_schedules FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'schedules_insert_own' AND tablename = 'agent_schedules') THEN
    CREATE POLICY "schedules_insert_own" ON public.agent_schedules FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'schedules_update_own' AND tablename = 'agent_schedules') THEN
    CREATE POLICY "schedules_update_own" ON public.agent_schedules FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'schedules_delete_own' AND tablename = 'agent_schedules') THEN
    CREATE POLICY "schedules_delete_own" ON public.agent_schedules FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  session_id UUID,
  lane TEXT DEFAULT 'main',
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logs_select_own' AND tablename = 'execution_logs') THEN
    CREATE POLICY "logs_select_own" ON public.execution_logs FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = execution_logs.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logs_insert_own' AND tablename = 'execution_logs') THEN
    CREATE POLICY "logs_insert_own" ON public.execution_logs FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = execution_logs.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  coming_soon BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_capabilities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'capabilities_public_read' AND tablename = 'platform_capabilities') THEN
    CREATE POLICY "capabilities_public_read" ON public.platform_capabilities FOR SELECT USING (true);
  END IF;
END $$;
