'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { uniqueChannelName } from './realtime';
import { SEASON } from './teams';
import type { SeasonTeam, SquadPlayer } from './squads';

type PlayerChange = (next: SquadPlayer | null, prev: SquadPlayer | null) => void;

/**
 * All squad players + purses for the season, kept live via Supabase realtime.
 * `onPlayerChange` fires for realtime updates only (not the initial load).
 */
export function useSquads(onPlayerChange?: PlayerChange) {
    const [players, setPlayers] = useState<SquadPlayer[]>([]);
    const [purses, setPurses] = useState<Record<string, number | null>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const changeRef = useRef(onPlayerChange);
    changeRef.current = onPlayerChange;
    const playersRef = useRef<SquadPlayer[]>([]);
    playersRef.current = players;

    const load = useCallback(async () => {
        const [{ data: p, error: pe }, { data: t, error: te }] = await Promise.all([
            supabase.from('squad_players').select('*').eq('season', SEASON).limit(1000),
            supabase.from('season_teams').select('*').eq('season', SEASON),
        ]);
        if (pe || te) {
            setError((pe || te)!.message);
        } else {
            setError(null);
            setPlayers((p ?? []).map(normalize));
            setPurses(Object.fromEntries((t ?? []).map((r: SeasonTeam) => [r.team_code, r.purse == null ? null : Number(r.purse)])));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();

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
                // Catch up on anything missed while the socket was down.
                if (state === 'SUBSCRIBED') load();
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [load]);

    return { players, purses, loading, error, reload: load };
}

function normalize(row: any): SquadPlayer {
    return { ...row, price: Number(row.price) };
}
