-- Migration: Add slug to agents (public id format a_************)
-- Date: 2025-02-24
-- Description: Agent URLs use human-friendly slug (a_ + 12 alphanumeric) instead of raw UUID.

-- Add slug column (nullable first for backfill)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing agents: a_ + first 12 hex chars of uuid (no hyphens)
UPDATE agents
SET slug = 'a_' || substring(replace(id::text, '-', '') FROM 1 FOR 12)
WHERE slug IS NULL;

-- Unique index (fail if duplicates exist; fix duplicates in app if needed)
CREATE UNIQUE INDEX IF NOT EXISTS agents_slug_unique ON agents(slug);

-- Require slug for new rows (app must supply on insert)
ALTER TABLE agents ALTER COLUMN slug SET NOT NULL;

COMMENT ON COLUMN agents.slug IS 'Public identifier for URLs, format a_************ (12 alphanumeric).';