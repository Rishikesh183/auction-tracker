import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client for API routes.
// Uses the service role key when set (needed once the public write policies on
// the 2026 tables are removed - see supabase/lock-public-writes.sql).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseServer = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
});
