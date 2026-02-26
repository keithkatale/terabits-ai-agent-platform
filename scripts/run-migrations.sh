#!/usr/bin/env bash
# Run 20260226 desktop/scheduling migrations in order.
# Requires: POSTGRES_URL_NON_POOLING in env (e.g. from .env.local).
# Usage: source .env.local 2>/dev/null; ./scripts/run-migrations.sh
# Or: export POSTGRES_URL_NON_POOLING='postgres://...'; ./scripts/run-migrations.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"

if [ -z "$POSTGRES_URL_NON_POOLING" ]; then
  echo "Error: POSTGRES_URL_NON_POOLING is not set. Source .env.local or export it."
  exit 1
fi

run_sql() {
  psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f "$1"
  echo "Applied: $1"
}

run_sql "$MIGRATIONS_DIR/20260226_desktops.sql"
run_sql "$MIGRATIONS_DIR/20260226_desktop_files_bucket.sql"
run_sql "$MIGRATIONS_DIR/20260226_scheduled_tasks.sql"
run_sql "$MIGRATIONS_DIR/20260226_backfill_desktops_from_sessions.sql"

echo "All four migrations applied."
