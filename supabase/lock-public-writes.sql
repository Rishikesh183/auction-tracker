-- Security fix: the 2026 tables let ANYONE with the public (anon) key insert,
-- update and delete rows (policies "FOR ALL USING (true)"). The anon key ships
-- in every visitor's browser, so anyone could wipe or edit the data.
--
-- After this, the public can only READ. The admin API routes write with the
-- service role key (SUPABASE_SERVICE_ROLE_KEY), which bypasses RLS.
-- Run once in the Supabase SQL editor. Safe to re-run.

drop policy if exists "Allow all operations for authenticated users on current_player" on current_player;
drop policy if exists "Allow all operations for authenticated users on bidding_history" on bidding_history;
drop policy if exists "Allow all operations for authenticated users on teams" on teams;
drop policy if exists "Allow all operations for authenticated users on retained_players" on retained_players;
drop policy if exists "Allow all operations for authenticated users on auction_purchases" on auction_purchases;

-- Read policies stay:
--   "Allow public read access on current_player" / bidding_history / teams /
--   retained_players / auction_purchases

-- Check what is left (should be SELECT only for these tables):
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
