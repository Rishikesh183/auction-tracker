import { unstable_cache } from 'next/cache';
import { supabaseServer } from './supabaseServer';
import { SEASON } from './teams';
import type { SquadPlayer } from './squads';

// SERVER ONLY. Cached snapshot of the season's squads for server-rendered pages
// (SEO: search engines and AI crawlers get the full lists in the HTML).
// Admin writes call revalidateTag(SQUADS_TAG) so pages refresh immediately.

export const SQUADS_TAG = 'squads';

export interface SquadSnapshot {
    players: SquadPlayer[];
    teams: { team_code: string; purse: number | null }[];
    at: string;
}

export const getSquadSnapshot = unstable_cache(
    async (): Promise<SquadSnapshot> => {
        const [p, t] = await Promise.all([
            supabaseServer.from('squad_players').select('*').eq('season', SEASON).limit(1000),
            supabaseServer.from('season_teams').select('team_code, purse').eq('season', SEASON),
        ]);
        if (p.error) throw p.error;
        if (t.error) throw t.error;
        return {
            players: (p.data ?? []).map((r) => ({ ...r, price: Number(r.price) })),
            teams: (t.data ?? []).map((r) => ({ team_code: r.team_code, purse: r.purse == null ? null : Number(r.purse) })),
            at: new Date().toISOString(),
        };
    },
    ['squad-snapshot'],
    { revalidate: 30, tags: [SQUADS_TAG] }
);

/** Snapshot or null (pages still render if the DB is unreachable). */
export async function trySquadSnapshot(): Promise<SquadSnapshot | null> {
    try {
        return await getSquadSnapshot();
    } catch (e) {
        console.error('squad snapshot failed', e);
        return null;
    }
}
