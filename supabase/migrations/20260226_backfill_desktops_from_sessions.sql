-- Backfill desktops from existing Personal Assistant chat sessions.
-- Run once after deploying desktops so that existing sessions get a desktop row
-- with id = session_id (same session_id as in messages).
-- user_id is inferred from the agent: messages.agent_id -> agents.user_id.
-- Sessions where the PA agent has user_id NULL (guest) are skipped; we only backfill where user_id is known.

INSERT INTO desktops (id, user_id, title, created_at, updated_at)
SELECT sub.session_id, sub.user_id, 'Migrated session', sub.created_at_min, sub.updated_at_max
FROM (
  SELECT
    m.session_id,
    a.user_id,
    MIN(m.created_at) AS created_at_min,
    MAX(m.created_at) AS updated_at_max
  FROM messages m
  JOIN agents a ON a.id = m.agent_id
  WHERE a.name = 'Personal Assistant'
    AND a.user_id IS NOT NULL
    AND m.session_id IS NOT NULL
    AND m.session_id NOT IN (SELECT id FROM desktops)
  GROUP BY m.session_id, a.user_id
) sub
ON CONFLICT (id) DO NOTHING;
