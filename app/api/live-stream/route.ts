import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, hasServiceKey } from '@/lib/supabaseAdmin';
import { LIVE_STREAM_KEY, cleanStreamUrl } from '@/lib/liveStream';

export const dynamic = 'force-dynamic';

// GET: public. The header polls this, so let the CDN absorb the traffic for a few seconds.
// Last value read, kept if Supabase errors so the button doesn't vanish mid-stream.
let lastUrl: string | null = null;

export async function GET() {
    let url: string | null = lastUrl;
    if (hasServiceKey) {
        try {
            const { data, error } = await supabaseAdmin.from('site_settings').select('value').eq('key', LIVE_STREAM_KEY).maybeSingle();
            if (!error) url = lastUrl = cleanStreamUrl(data?.value);
        } catch {
            /* keep lastUrl */
        }
    }
    return NextResponse.json(
        { url },
        { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=20' } }
    );
}

// POST { url: string | null }: admin sets or clears the live stream link.
export const POST = withAdmin(async (req: NextRequest) => {
    const body = await req.json().catch(() => ({}));
    const raw = body?.url;
    const clearing = raw == null || String(raw).trim() === '';
    const url = clearing ? null : cleanStreamUrl(raw);
    if (!clearing && !url) {
        return NextResponse.json({ error: 'Enter a valid http(s) link' }, { status: 400 });
    }
    if (!hasServiceKey) {
        return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 });
    }
    const { error } = await supabaseAdmin
        .from('site_settings')
        .upsert({ key: LIVE_STREAM_KEY, value: url, updated_at: new Date().toISOString() });
    if (error) {
        const hint = error.code === '42P01' || /site_settings/.test(error.message) ? ' (run supabase/live-stream.sql)' : '';
        return NextResponse.json({ error: error.message + hint }, { status: 500 });
    }
    lastUrl = url;
    return NextResponse.json({ url });
});
