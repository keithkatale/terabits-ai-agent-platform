-- Terabits: Full database schema
-- Profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', null)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Agents (AI Employees)
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT DEFAULT 'draft',
  system_prompt TEXT,
  model TEXT DEFAULT 'gemini-3-flash-preview',
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
CREATE POLICY "agents_select_own" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agents_insert_own" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agents_update_own" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agents_delete_own" ON public.agents FOR DELETE USING (auth.uid() = user_id);

-- Agent Skills
CREATE TABLE IF NOT EXISTS public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  skill_content TEXT,
  skill_type TEXT DEFAULT 'custom',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_select_own" ON public.agent_skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "skills_insert_own" ON public.agent_skills FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "skills_update_own" ON public.agent_skills FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "skills_delete_own" ON public.agent_skills FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));

-- Workflow Nodes (React Flow)
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  label TEXT NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nodes_select_own" ON public.workflow_nodes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "nodes_insert_own" ON public.workflow_nodes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "nodes_update_own" ON public.workflow_nodes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "nodes_delete_own" ON public.workflow_nodes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));

-- Workflow Edges (React Flow connections)
CREATE TABLE IF NOT EXISTS public.workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label TEXT,
  edge_type TEXT DEFAULT 'default',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edges_select_own" ON public.workflow_edges FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "edges_insert_own" ON public.workflow_edges FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "edges_update_own" ON public.workflow_edges FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "edges_delete_own" ON public.workflow_edges FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));

-- Chat Messages
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
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));

-- Agent Memory
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
CREATE POLICY "memory_select_own" ON public.agent_memory FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "memory_insert_own" ON public.agent_memory FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "memory_update_own" ON public.agent_memory FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "memory_delete_own" ON public.agent_memory FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_memory.agent_id AND agents.user_id = auth.uid()));

-- Agent Schedules
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
CREATE POLICY "schedules_select_own" ON public.agent_schedules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "schedules_insert_own" ON public.agent_schedules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "schedules_update_own" ON public.agent_schedules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "schedules_delete_own" ON public.agent_schedules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_schedules.agent_id AND agents.user_id = auth.uid()));

-- Execution Logs
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
CREATE POLICY "logs_select_own" ON public.execution_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = execution_logs.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "logs_insert_own" ON public.execution_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = execution_logs.agent_id AND agents.user_id = auth.uid()));

-- Platform Capabilities (public read)
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
CREATE POLICY "capabilities_public_read" ON public.platform_capabilities FOR SELECT USING (true);
