-- Site-wide settings (currently: the "Watch live" stream link shown in the header).
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Everyone can read; writes only via /api/live-stream (service role key).
alter table site_settings enable row level security;
drop policy if exists "public read site_settings" on site_settings;
create policy "public read site_settings" on site_settings for select using (true);
