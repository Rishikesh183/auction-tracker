'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { uniqueChannelName } from './realtime';
import { SEASON } from './teams';
import type { SeasonTeam, SquadPlayer } from './squads';

type PlayerChange = (next: SquadPlayer | null, prev: SquadPlayer | null) => void;

interface Options {
    /** Fires for realtime updates only (not the initial load). */
    onPlayerChange?: PlayerChange;
    /**
     * Admin pages: read straight from Supabase (always fresh).
     * Viewer pages (default): read the CDN-cached /api/squads snapshot.
     */
    fresh?: boolean;
    /** Server-rendered data: first paint (and crawlers) get the full lists. */
    initial?: { players: SquadPlayer[]; teams: Pick<SeasonTeam, 'team_code' | 'purse'>[] };
}

const POLL_MS = 10_000;

/**
 * All squad players + purses for the season, kept live.
 * - Realtime (Supabase postgres_changes) pushes each change instantly.
 * - If realtime is down or over the plan's connection limit, it falls back to
 *   polling the cached snapshot every ~10 s, so the page never goes stale.
 */
export function useSquads(opts: Options | PlayerChange = {}) {
    const { onPlayerChange, fresh = false, initial } = typeof opts === 'function' ? { onPlayerChange: opts } : opts;

    const [players, setPlayers] = useState<SquadPlayer[]>(() => (initial?.players ?? []).map(normalize));
    const [purses, setPurses] = useState<Record<string, number | null>>(() =>
        Object.fromEntries((initial?.teams ?? []).map((r) => [r.team_code, r.purse == null ? null : Number(r.purse)]))
    );
    const [loading, setLoading] = useState(!initial);
    const [error, setError] = useState<string | null>(null);
    const [live, setLive] = useState(false);
    const changeRef = useRef(onPlayerChange);
    changeRef.current = onPlayerChange;
    const playersRef = useRef<SquadPlayer[]>([]);
    playersRef.current = players;

    const apply = (p: any[], t: Pick<SeasonTeam, 'team_code' | 'purse'>[], snapshotAt?: string) => {
        const incoming = p.map(normalize);
        setPlayers((current) => {
            if (current.length === 0 || !snapshotAt) return incoming;
            // A cached snapshot can be a few seconds old: never let it overwrite a
            // newer realtime change, and don't drop rows created after it was taken.
            const byId = new Map(current.map((r) => [r.id, r]));
            const merged = incoming.map((r) => {
                const mine = byId.get(r.id);
                return mine && ts(mine.updated_at) > ts(r.updated_at) ? mine : r;
            });
            const ids = new Set(incoming.map((r) => r.id));
            for (const r of current) {
                if (!ids.has(r.id) && ts(r.updated_at) > ts(snapshotAt)) merged.push(r);
            }
            return merged;
        });
        setPurses(Object.fromEntries(t.map((r) => [r.team_code, r.purse == null ? null : Number(r.purse)])));
    };

    const load = useCallback(async () => {
        try {
            if (fresh) {
                const [{ data: p, error: pe }, { data: t, error: te }] = await Promise.all([
                    supabase.from('squad_players').select('*').eq('season', SEASON).limit(1000),
                    supabase.from('season_teams').select('team_code, purse').eq('season', SEASON),
                ]);
                if (pe || te) throw new Error((pe || te)!.message);
                apply(p ?? [], t ?? []);
            } else {
                const r = await fetch('/api/squads');
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
                apply(d.players, d.teams, d.at);
            }
            setError(null);
        } catch (e) {
            // Keep showing the last good data if we have it
            if (playersRef.current.length === 0) setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [fresh]);

    useEffect(() => {
        load();
        let poll: ReturnType<typeof setInterval> | null = null;
        let subscribedOnce = false;

        const startPolling = () => {
            if (poll) return;
            // jitter so thousands of clients don't poll in lock-step
            poll = setInterval(() => {
                if (document.visibilityState === 'visible') load();
            }, POLL_MS + Math.random() * 3000);
        };
        const stopPolling = () => {
            if (poll) clearInterval(poll);
            poll = null;
        };

        const channel = supabase
            .channel(uniqueChannelName('squads'))
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'squad_players', filter: `season=eq.${SEASON}` },
                (payload: any) => {
                    if (payload.eventType === 'DELETE') {
                        const prev = playersRef.current.find((p) => p.id === payload.old?.id) ?? null;
                        setPlayers((list) => list.filter((p) => p.id !== payload.old?.id));
                        changeRef.current?.(null, prev);
                        return;
                    }
                    const next = normalize(payload.new);
                    const prev = playersRef.current.find((p) => p.id === next.id) ?? null;
                    setPlayers((list) => [...list.filter((p) => p.id !== next.id), next]);
                    changeRef.current?.(next, prev);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'season_teams', filter: `season=eq.${SEASON}` },
                (payload: any) => {
                    const row = payload.new as SeasonTeam;
                    if (!row?.team_code) return;
                    setPurses((m) => ({ ...m, [row.team_code]: row.purse == null ? null : Number(row.purse) }));
                }
            )
            .subscribe((state) => {
                if (state === 'SUBSCRIBED') {
                    setLive(true);
                    stopPolling();
                    // Catch up on anything missed while disconnected (not on the first join)
                    if (subscribedOnce) load();
                    subscribedOnce = true;
                } else {
                    // CHANNEL_ERROR / TIMED_OUT / CLOSED (e.g. connection limit reached)
                    setLive(false);
                    startPolling();
                }
            });

        // Refresh when the tab comes back after being hidden for a while
        const onVisible = () => {
            if (document.visibilityState === 'visible') load();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(channel);
        };
    }, [load]);

    return { players, purses, loading, error, live, reload: load };
}

const ts = (iso: string) => Date.parse(iso) || 0;

function normalize(row: any): SquadPlayer {
    return { ...row, price: Number(row.price) };
}
