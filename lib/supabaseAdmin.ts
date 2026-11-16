import { createClient } from '@supabase/supabase-js';

// SERVER ONLY. Uses the service role key, which bypasses RLS.
// Never import this from a 'use client' file.
if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin must not be imported in the browser');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(url ?? 'http://missing', serviceKey ?? 'missing', {
    auth: { persistSession: false, autoRefreshToken: false },
});

export const hasServiceKey = Boolean(url && serviceKey);
