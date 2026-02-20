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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_select_own' AND tablename = 'agent_skills') THEN
    CREATE POLICY "skills_select_own" ON public.agent_skills FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_insert_own' AND tablename = 'agent_skills') THEN
    CREATE POLICY "skills_insert_own" ON public.agent_skills FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_update_own' AND tablename = 'agent_skills') THEN
    CREATE POLICY "skills_update_own" ON public.agent_skills FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_delete_own' AND tablename = 'agent_skills') THEN
    CREATE POLICY "skills_delete_own" ON public.agent_skills FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_skills.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nodes_select_own' AND tablename = 'workflow_nodes') THEN
    CREATE POLICY "nodes_select_own" ON public.workflow_nodes FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nodes_insert_own' AND tablename = 'workflow_nodes') THEN
    CREATE POLICY "nodes_insert_own" ON public.workflow_nodes FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nodes_update_own' AND tablename = 'workflow_nodes') THEN
    CREATE POLICY "nodes_update_own" ON public.workflow_nodes FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nodes_delete_own' AND tablename = 'workflow_nodes') THEN
    CREATE POLICY "nodes_delete_own" ON public.workflow_nodes FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_nodes.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_select_own' AND tablename = 'workflow_edges') THEN
    CREATE POLICY "edges_select_own" ON public.workflow_edges FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_insert_own' AND tablename = 'workflow_edges') THEN
    CREATE POLICY "edges_insert_own" ON public.workflow_edges FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_update_own' AND tablename = 'workflow_edges') THEN
    CREATE POLICY "edges_update_own" ON public.workflow_edges FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'edges_delete_own' AND tablename = 'workflow_edges') THEN
    CREATE POLICY "edges_delete_own" ON public.workflow_edges FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.agents WHERE agents.id = workflow_edges.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;
