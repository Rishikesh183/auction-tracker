import { unstable_cache } from 'next/cache';
import { supabaseServer } from './supabaseServer';
import { SEASON } from './teams';
import { normalizeTrade, type SquadPlayer, type Trade } from './squads';

// SERVER ONLY. Cached snapshot of the season's squads for server-rendered pages
// (SEO: search engines and AI crawlers get the full lists in the HTML).
// Admin writes call revalidateTag(SQUADS_TAG) so pages refresh immediately.

export const SQUADS_TAG = 'squads';

export interface SquadSnapshot {
    players: SquadPlayer[];
    teams: { team_code: string; purse: number | null }[];
    trades: Trade[];
    at: string;
}

/** Trade history, newest first. Empty (not an error) if supabase/trades.sql hasn't been run. */
export async function fetchTrades(): Promise<Trade[]> {
    const { data, error } = await supabaseServer
        .from('trades')
        .select('*')
        .eq('season', SEASON)
        .order('seq', { ascending: false })
        .limit(200);
    if (error) {
        console.error('trades fetch failed (run supabase/trades.sql?)', error.message);
        return [];
    }
    return (data ?? []).map(normalizeTrade);
}

export const getSquadSnapshot = unstable_cache(
    async (): Promise<SquadSnapshot> => {
        const [p, t, tr] = await Promise.all([
            supabaseServer.from('squad_players').select('*').eq('season', SEASON).limit(1000),
            supabaseServer.from('season_teams').select('team_code, purse').eq('season', SEASON),
            fetchTrades(),
        ]);
        if (p.error) throw p.error;
        if (t.error) throw t.error;
        return {
            trades: tr,
            players: (p.data ?? []).map((r) => ({ ...r, price: Number(r.price) })),
            teams: (t.data ?? []).map((r) => ({ team_code: r.team_code, purse: r.purse == null ? null : Number(r.purse) })),
            at: new Date().toISOString(),
        };
    },
    ['squad-snapshot'],
    { revalidate: 30, tags: [SQUADS_TAG] }
);

// Last good snapshot on this server instance, so a Supabase outage during a
// page re-render doesn't replace the cached page with empty lists.
let lastGood: SquadSnapshot | null = null;

/** Snapshot or null (pages still render if the DB is unreachable). */
export async function trySquadSnapshot(): Promise<SquadSnapshot | null> {
    try {
        lastGood = await getSquadSnapshot();
        return lastGood;
    } catch (e) {
        console.error('squad snapshot failed', e);
        return lastGood;
    }
}
