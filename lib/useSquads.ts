'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { uniqueChannelName } from './realtime';
import { SEASON } from './teams';
import { normalizeTrade, type SeasonTeam, type SquadPlayer, type Trade } from './squads';

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
    initial?: { players: SquadPlayer[]; teams: Pick<SeasonTeam, 'team_code' | 'purse'>[]; trades?: Trade[] };
}

const POLL_MS = 10_000;

/**
 * Viewer pages poll the CDN-cached /api/squads snapshot instead of opening a
 * Supabase Realtime socket each. postgres_changes fans every row change out to
 * every subscriber, so one "publish team list" (~20 rows) x a few hundred viewers
 * blows through the plan's messages-per-second limit, and Supabase then drops
 * every socket at once. Polling the CDN scales with no Supabase load.
 * Set NEXT_PUBLIC_VIEWER_REALTIME=on to go back to per-viewer realtime.
 * Admin pages (fresh: true) always use realtime.
 */
const VIEWER_REALTIME = process.env.NEXT_PUBLIC_VIEWER_REALTIME === 'on';
const VIEWER_POLL_MS = 8_000;

/**
 * All squad players + purses for the season, kept live.
 * - Realtime (Supabase postgres_changes) pushes each change instantly.
 * - If realtime is down or over the plan's connection limit, it falls back to
 *   polling the cached snapshot every ~10 s, so the page never goes stale.
 */
export function useSquads(opts: Options | PlayerChange = {}) {
    const { onPlayerChange, fresh = false, initial } = typeof opts === 'function' ? { onPlayerChange: opts } : opts;
    const useRealtime = fresh || VIEWER_REALTIME;

    const [players, setPlayers] = useState<SquadPlayer[]>(() => (initial?.players ?? []).map(normalize));
    const [purses, setPurses] = useState<Record<string, number | null>>(() =>
        Object.fromEntries((initial?.teams ?? []).map((r) => [r.team_code, r.purse == null ? null : Number(r.purse)]))
    );
    const [trades, setTrades] = useState<Trade[]>(() => (initial?.trades ?? []).map(normalizeTrade));
    const [loading, setLoading] = useState(!initial);
    const [error, setError] = useState<string | null>(null);
    const [live, setLive] = useState(false);
    const changeRef = useRef(onPlayerChange);
    changeRef.current = onPlayerChange;
    const playersRef = useRef<SquadPlayer[]>([]);
    const polledOnce = useRef(false);
    playersRef.current = players;

    const apply = (p: any[], t: Pick<SeasonTeam, 'team_code' | 'purse'>[], snapshotAt?: string, notify = false) => {
        const incoming = p.map(normalize);
        // Polling mode: report changes since the last snapshot (realtime does this per event)
        // (skipped on the first load, so opening the page doesn't replay old changes as toasts)
        if (notify && polledOnce.current && changeRef.current && playersRef.current.length > 0) {
            const before = new Map(playersRef.current.map((r) => [r.id, r]));
            for (const r of incoming) {
                const prev = before.get(r.id) ?? null;
                if (!prev || ts(r.updated_at) > ts(prev.updated_at)) changeRef.current(r, prev);
            }
        }
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
                const [{ data: p, error: pe }, { data: t, error: te }, { data: tr }] = await Promise.all([
                    supabase.from('squad_players').select('*').eq('season', SEASON).limit(1000),
                    supabase.from('season_teams').select('team_code, purse').eq('season', SEASON),
                    // no error check: the trades table is optional until supabase/trades.sql is run
                    supabase.from('trades').select('*').eq('season', SEASON).order('seq', { ascending: false }).limit(200),
                ]);
                if (pe || te) throw new Error((pe || te)!.message);
                apply(p ?? [], t ?? []);
                setTrades((tr ?? []).map(normalizeTrade));
            } else {
                // no-store: skip the BROWSER cache (the API's stale-while-revalidate is meant for the CDN;
                // in the browser it would hand back the previous poll's data). The CDN still caches it.
                const r = await fetch('/api/squads', { cache: 'no-store' });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
                apply(d.players, d.teams, d.at, !useRealtime);
                if (Array.isArray(d.trades)) setTrades(d.trades.map(normalizeTrade));
                polledOnce.current = true;
                if (!useRealtime) setLive(true);
            }
            setError(null);
        } catch (e) {
            if (!useRealtime) setLive(false);
            // Keep showing the last good data if we have it
            if (playersRef.current.length === 0) setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [fresh, useRealtime]);

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

        // Refresh when the tab comes back after being hidden for a while
        const onVisible = () => {
            if (document.visibilityState === 'visible') load();
        };
        document.addEventListener('visibilitychange', onVisible);

        if (!useRealtime) {
            poll = setInterval(() => {
                if (document.visibilityState === 'visible') load();
            }, VIEWER_POLL_MS + Math.random() * 3000);
            return () => {
                stopPolling();
                document.removeEventListener('visibilitychange', onVisible);
            };
        }

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

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(channel);
        };
    }, [load, useRealtime]);

    return { players, purses, trades, loading, error, live, reload: load };
}

const ts = (iso: string) => Date.parse(iso) || 0;

function normalize(row: any): SquadPlayer {
    return { ...row, price: Number(row.price) };
}
