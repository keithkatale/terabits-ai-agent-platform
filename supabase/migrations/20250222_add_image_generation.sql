-- Create public storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-generated-images', 'ai-generated-images', true)
ON CONFLICT DO NOTHING;

-- RLS policy: Anyone can view images
CREATE POLICY IF NOT EXISTS "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-generated-images');

-- RLS policy: Authenticated users can upload images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ai-generated-images' AND
    auth.role() = 'authenticated'
  );

-- Tracking table for generated images + TTL management
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  execution_log_id UUID REFERENCES execution_logs(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  resolution VARCHAR(20) DEFAULT '1024x1024',
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  file_size_kb INTEGER,
  mime_type TEXT DEFAULT 'image/png',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_generated_images_agent_id ON generated_images(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_execution_log_id ON generated_images(execution_log_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at);

-- Enable RLS on generated_images table
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view images for their own agents
CREATE POLICY IF NOT EXISTS "Users can view their agent images" ON generated_images
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    ) OR
    agent_id IN (
      SELECT id FROM agents WHERE user_id IS NULL
    )
  );

-- RLS policy: Only authenticated users can insert
CREATE POLICY IF NOT EXISTS "Authenticated users can create images" ON generated_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
