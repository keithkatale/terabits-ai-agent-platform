-- List direct children (one level) of a storage prefix: both files and folders.
-- Used when depth=1 so the UI shows folders and files together (Supabase list() can omit files).
-- Runs with SECURITY INVOKER so RLS on storage.objects applies.

CREATE OR REPLACE FUNCTION public.list_storage_direct(
  p_bucket_id text,
  p_prefix text
)
RETURNS TABLE (
  name text,
  path text,
  is_folder boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  full_prefix text := rtrim(p_prefix, '/') || '/';
BEGIN
  RETURN QUERY
  -- Direct files: object name = prefix + one segment (no slash in segment)
  SELECT
    substring(o.name from length(full_prefix) + 1) AS name,
    o.name AS path,
    false AS is_folder
  FROM storage.objects o
  WHERE o.bucket_id = p_bucket_id
    AND o.name LIKE full_prefix || '%'
    AND o.name <> full_prefix
    AND substring(o.name from length(full_prefix) + 1) NOT LIKE '%/%'
  UNION ALL
  -- Direct folders: distinct first segment of objects with deeper paths
  SELECT DISTINCT
    split_part(substring(o.name from length(full_prefix) + 1), '/', 1) AS name,
    (full_prefix || split_part(substring(o.name from length(full_prefix) + 1), '/', 1)) AS path,
    true AS is_folder
  FROM storage.objects o
  WHERE o.bucket_id = p_bucket_id
    AND o.name LIKE full_prefix || '%'
    AND substring(o.name from length(full_prefix) + 1) LIKE '%/%'
  ORDER BY 3 DESC, 1 ASC;  -- folders first, then by name
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_storage_direct(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_storage_direct(text, text) TO service_role;
