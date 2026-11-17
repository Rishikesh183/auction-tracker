// Types + pure helpers for season squads (safe on server and client).

export type SquadStatus = 'pending' | 'retained' | 'released';

/** What viewers see: a retained player who joined by trade shows as "traded". */
export type DisplayStatus = SquadStatus | 'traded';

/** Joined this team by trade and kept (not released). */
export const isTradedIn = (p: Pick<SquadPlayer, 'acquired_via' | 'status'>) => p.acquired_via === 'trade' && p.status === 'retained';

export const displayStatus = (p: Pick<SquadPlayer, 'acquired_via' | 'status'>): DisplayStatus => (isTradedIn(p) ? 'traded' : p.status);

export interface SquadPlayer {
    id: string;
    season: number;
    team_code: string;
    player_name: string;
    price: number;
    country: string | null;
    is_captain: boolean;
    is_wk: boolean;
    acquired_via: 'squad' | 'trade' | 'added' | 'auction';
    status: SquadStatus;
    sort_order: number;
    photo_key: string | null;
    status_changed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TradeLeg {
    player_id: string | null;
    player_name: string;
    from_team: string;
    to_team: string;
    /** New contract price after the trade (₹ Cr) */
    price: number;
    photo_key: string | null;
    country: string | null;
}

export interface Trade {
    id: string;
    seq: number;
    season: number;
    team_a: string;
    team_b: string;
    legs: TradeLeg[];
    created_at: string;
}

/** Newest first. */
export const byTradeSeq = (a: Trade, b: Trade) => Number(b.seq) - Number(a.seq);

export function normalizeTrade(t: any): Trade {
    return {
        ...t,
        seq: Number(t.seq),
        legs: (Array.isArray(t.legs) ? t.legs : []).map((l: any) => ({ ...l, price: Number(l.price) })),
    };
}

export interface SeasonTeam {
    season: number;
    team_code: string;
    purse: number | null;
}

export const slug = (s: string) =>
    s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const byOrder = (a: SquadPlayer, b: SquadPlayer) =>
    a.sort_order - b.sort_order || a.player_name.localeCompare(b.player_name);

export function summarize(players: SquadPlayer[]) {
    const retained = players.filter((p) => p.status === 'retained').sort(byOrder);
    const released = players.filter((p) => p.status === 'released').sort(byOrder);
    const pending = players.filter((p) => p.status === 'pending').sort(byOrder);
    return {
        retained,
        released,
        pending,
        /** retained, minus players who joined by trade */
        retainedOnly: retained.filter((p) => !isTradedIn(p)),
        /** joined by trade (still in the squad) */
        tradedIn: retained.filter(isTradedIn),
        total: players.length,
        retainedSpend: retained.reduce((s, p) => s + Number(p.price), 0),
        releasedValue: released.reduce((s, p) => s + Number(p.price), 0),
        retainedOverseas: retained.filter((p) => p.country).length,
        announced: players.length > 0 && pending.length === 0,
    };
}
