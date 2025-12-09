'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import type { CurrentPlayer, BiddingHistory, Team } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook to subscribe to current player updates in real-time
 */
export function useCurrentPlayer() {
    const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: RealtimeChannel;

        const fetchCurrentPlayer = async () => {
            const { data, error } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'live')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data) {
                setCurrentPlayer(data);
            }
            setLoading(false);
        };

        fetchCurrentPlayer();

        // Subscribe to realtime updates
        channel = supabase
            .channel('current_player_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'current_player',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newPlayer = payload.new as CurrentPlayer;
                        if (newPlayer.status === 'live') {
                            setCurrentPlayer(newPlayer);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setCurrentPlayer(null);
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    return { currentPlayer, loading };
}

/**
 * Custom hook to subscribe to bidding history in real-time
 */
export function useBiddingHistory(playerId?: string) {
    const [biddingHistory, setBiddingHistory] = useState<BiddingHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: RealtimeChannel;

        const fetchBiddingHistory = async () => {
            let query = supabase
                .from('bidding_history')
                .select('*')
                .order('timestamp', { ascending: false });

            if (playerId) {
                query = query.eq('player_id', playerId);
            }

            const { data, error } = await query.limit(50);

            if (!error && data) {
                setBiddingHistory(data);
            }
            setLoading(false);
        };

        fetchBiddingHistory();

        // Subscribe to realtime updates
        channel = supabase
            .channel('bidding_history_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bidding_history',
                },
                (payload) => {
                    const newBid = payload.new as BiddingHistory;
                    if (!playerId || newBid.player_id === playerId) {
                        setBiddingHistory((prev) => [newBid, ...prev].slice(0, 50));
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [playerId]);

    return { biddingHistory, loading };
}

/**
 * Custom hook to subscribe to team updates in real-time
 */
export function useTeams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: RealtimeChannel;

        const fetchTeams = async () => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('name', { ascending: true });

            if (!error && data) {
                setTeams(data);
            }
            setLoading(false);
        };

        fetchTeams();

        // Subscribe to realtime updates
        channel = supabase
            .channel('teams_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'teams',
                },
                (payload) => {
                    const updatedTeam = payload.new as Team;
                    setTeams((prev) =>
                        prev.map((team) => (team.id === updatedTeam.id ? updatedTeam : team))
                    );
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    return { teams, loading };
}
