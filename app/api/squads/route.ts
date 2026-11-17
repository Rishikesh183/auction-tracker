import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { SEASON } from '@/lib/teams';
import { fetchTrades } from '@/lib/squadsServer';

// Public, cached snapshot of all squads for the season.
// Viewers load this instead of querying Supabase directly, so a spike of
// thousands of visitors at 6 PM hits the CDN, not the database.
export const dynamic = 'force-dynamic';

const TTL_MS = 2000;
let cache: { at: number; body: unknown } | null = null;
let inflight: Promise<unknown> | null = null;

async function fetchSnapshot() {
    const [p, t, trades] = await Promise.all([
        supabaseServer.from('squad_players').select('*').eq('season', SEASON).limit(1000),
        supabaseServer.from('season_teams').select('team_code, purse').eq('season', SEASON),
        fetchTrades(),
    ]);
    if (p.error) throw p.error;
    if (t.error) throw t.error;
    return { players: p.data ?? [], teams: t.data ?? [], trades, at: new Date().toISOString() };
}

export async function GET() {
    try {
        // In-memory cache + request coalescing (one DB query per ~2 s per server)
        if (!cache || Date.now() - cache.at > TTL_MS) {
            inflight ??= fetchSnapshot().finally(() => {
                inflight = null;
            });
            const body = await inflight;
            cache = { at: Date.now(), body };
        }
        return NextResponse.json(cache.body, {
            headers: {
                // CDN (Vercel etc.) may serve this for 3 s, then refresh in the background
                'Cache-Control': 'public, max-age=0, s-maxage=3, stale-while-revalidate=30',
            },
        });
    } catch (e) {
        console.error('squads snapshot failed', e);
        // Supabase hiccup: keep serving the last good snapshot instead of an error
        if (cache) {
            return NextResponse.json(cache.body, {
                headers: { 'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=30', 'X-Snapshot-Stale': '1' },
            });
        }
        return NextResponse.json({ error: 'Could not load squads' }, { status: 503 });
    }
}
