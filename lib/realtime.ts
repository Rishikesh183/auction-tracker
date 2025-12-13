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
                .order('updated_at', { ascending: false }) // 👈 latest change
                .limit(1)
                .single();

            if (!error && data) {
                setCurrentPlayer(data);
            }
            setLoading(false);
        };

        fetchCurrentPlayer();

        // Subscribe to realtime updates - ALLOW ALL STATUS CHANGES
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
                        // Update for ALL status changes to allow Live page to react
                        setCurrentPlayer(newPlayer);
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

/**
 * Custom hook to fetch all players (sold and unsold) with real-time updates
 */
export function useAllPlayers() {
    const [soldPlayers, setSoldPlayers] = useState<CurrentPlayer[]>([]);
    const [unsoldPlayers, setUnsoldPlayers] = useState<CurrentPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: RealtimeChannel;

        const fetchPlayers = async () => {
            // Fetch sold players
            const { data: sold, error: soldError } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'completed')
                .order('updated_at', { ascending: false });

            if (!soldError && sold) {
                setSoldPlayers(sold);
            }

            // Fetch unsold players
            const { data: unsold, error: unsoldError } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'unsold')
                .order('updated_at', { ascending: false });

            if (!unsoldError && unsold) {
                setUnsoldPlayers(unsold);
            }

            setLoading(false);
        };

        fetchPlayers();

        // Subscribe to realtime updates
        channel = supabase
            .channel('all_players_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'current_player',
                },
                (payload) => {
                    const player = payload.new as CurrentPlayer;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (player.status === 'completed') {
                            setSoldPlayers((prev) => {
                                const filtered = prev.filter(p => p.id !== player.id);
                                return [player, ...filtered];
                            });
                            setUnsoldPlayers((prev) => prev.filter(p => p.id !== player.id));
                        } else if (player.status === 'unsold') {
                            setUnsoldPlayers((prev) => {
                                const filtered = prev.filter(p => p.id !== player.id);
                                return [player, ...filtered];
                            });
                            setSoldPlayers((prev) => prev.filter(p => p.id !== player.id));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    return { soldPlayers, unsoldPlayers, loading };
}

/**
 * Custom hook to calculate global auction statistics
 */
export function useGlobalStats() {
    const { teams, loading: teamsLoading } = useTeams();
    const { soldPlayers, unsoldPlayers, loading: playersLoading } = useAllPlayers();
    const [stats, setStats] = useState({
        totalSold: 0,
        totalUnsold: 0,
        totalMoneySpent: 0,
        totalRemainingPurse: 0,
        mostExpensivePlayer: null as CurrentPlayer | null,
        teamWithHighestPurse: null as Team | null,
    });

    useEffect(() => {
        if (!teamsLoading && !playersLoading) {
            const totalMoneySpent = soldPlayers.reduce((sum, player) => sum + player.current_bid, 0);
            const totalRemainingPurse = teams.reduce((sum, team) => sum + team.purse_remaining, 0);

            const mostExpensive = soldPlayers.length > 0
                ? soldPlayers.reduce((max, player) =>
                    player.current_bid > (max?.current_bid || 0) ? player : max
                )
                : null;

            const teamWithHighest = teams.length > 0
                ? teams.reduce((max, team) =>
                    team.purse_remaining > (max?.purse_remaining || 0) ? team : max
                )
                : null;

            setStats({
                totalSold: soldPlayers.length,
                totalUnsold: unsoldPlayers.length,
                totalMoneySpent,
                totalRemainingPurse,
                mostExpensivePlayer: mostExpensive,
                teamWithHighestPurse: teamWithHighest,
            });
        }
    }, [teams, soldPlayers, unsoldPlayers, teamsLoading, playersLoading]);

    return { stats, loading: teamsLoading || playersLoading };
}
