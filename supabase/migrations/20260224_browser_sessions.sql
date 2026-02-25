-- Browser Sessions: persistent encrypted auth sessions for AI agent use
-- Run this in your Supabase SQL editor or via `supabase db push`

create table if not exists browser_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  platform       varchar(100) not null,          -- 'linkedin', 'twitter', 'facebook', etc.
  platform_label varchar(200) not null,          -- display name, e.g. 'LinkedIn'
  platform_url   varchar(500) not null,          -- login URL for this platform
  -- AES-256-CBC encrypted JSON of Playwright context.storageState()
  -- Format: "<iv_hex>:<ciphertext_hex>"
  storage_state_encrypted text not null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  last_used_at   timestamptz,
  -- one saved session per platform per user
  unique(user_id, platform)
);

-- Index for fast user lookups
create index if not exists browser_sessions_user_id_idx on browser_sessions(user_id);

-- RLS: users can only access their own sessions
alter table browser_sessions enable row level security;

create policy "Users can manage their own browser sessions"
  on browser_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_browser_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger browser_sessions_updated_at
  before update on browser_sessions
  for each row execute function update_browser_sessions_updated_at();
