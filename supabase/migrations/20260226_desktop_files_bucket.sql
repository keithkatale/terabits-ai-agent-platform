-- Migration: desktop-files bucket for workspace uploads/output/refs
-- Path layout: {desktop_id}/uploads/..., {desktop_id}/output/..., {desktop_id}/refs/{ref_name}/...

INSERT INTO storage.buckets (id, name, public)
VALUES ('desktop-files', 'desktop-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: user can only access objects under a desktop they own.
-- Path first segment = desktop_id. Check desktops.user_id = auth.uid().
CREATE POLICY "Users can access their desktop files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'desktop-files'
    AND EXISTS (
      SELECT 1 FROM public.desktops d
      WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'desktop-files'
    AND EXISTS (
      SELECT 1 FROM public.desktops d
      WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id = auth.uid()
    )
  );
