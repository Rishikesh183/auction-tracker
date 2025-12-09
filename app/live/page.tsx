'use client';

import { useEffect, useState } from 'react';
import { useCurrentPlayer, useBiddingHistory, useTeams } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { toast, Toaster } from 'sonner';

export default function LivePage() {
    const { currentPlayer, loading: playerLoading } = useCurrentPlayer();
    const { biddingHistory, loading: historyLoading } = useBiddingHistory();
    const { teams, loading: teamsLoading } = useTeams();
    const [completedPlayers, setCompletedPlayers] = useState<any[]>([]);
    const [prevBidCount, setPrevBidCount] = useState(0);

    // Fetch completed players
    useEffect(() => {
        const fetchCompleted = async () => {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'completed')
                .order('updated_at', { ascending: false })
                .limit(10);

            if (data) {
                setCompletedPlayers(data);
            }
        };

        fetchCompleted();

        // Subscribe to completed players
        const setupSubscription = async () => {
            const { supabase } = await import('@/lib/supabaseClient');
            const channel = supabase
                .channel('completed_players')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'current_player',
                        filter: 'status=eq.completed',
                    },
                    (payload) => {
                        setCompletedPlayers((prev) => [payload.new, ...prev].slice(0, 10));
                    }
                )
                .subscribe();

            return () => {
                channel.unsubscribe();
            };
        };

        setupSubscription();
    }, []);

    // Show toast notification for new bids
    useEffect(() => {
        if (biddingHistory.length > prevBidCount && prevBidCount > 0) {
            const latestBid = biddingHistory[0];
            toast.success(`New Bid!`, {
                description: `${latestBid.team} bids ₹${latestBid.amount} Cr for ${latestBid.player_name}`,
                duration: 3000,
            });
        }
        setPrevBidCount(biddingHistory.length);
    }, [biddingHistory, prevBidCount]);

    if (playerLoading || historyLoading || teamsLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-2xl animate-pulse">Loading auction...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
            <Toaster position="top-right" richColors />

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 animate-pulse">
                        IPL AUCTION LIVE
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white/80 text-lg">LIVE NOW</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Player - Large Card */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-3xl text-center">Current Player</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {currentPlayer ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col md:flex-row gap-6 items-center">
                                            {currentPlayer.photo_url && (
                                                <div className="relative w-48 h-48 rounded-xl overflow-hidden border-4 border-yellow-400 shadow-2xl">
                                                    <Image
                                                        src={currentPlayer.photo_url}
                                                        alt={currentPlayer.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 space-y-4 text-center md:text-left">
                                                <h2 className="text-4xl font-bold">{currentPlayer.name}</h2>
                                                {currentPlayer.old_team && (
                                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                                        <span className="text-white/70">Previous Team:</span>
                                                        <Badge variant="secondary" className="text-lg px-3 py-1">
                                                            {currentPlayer.old_team}
                                                        </Badge>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                                    <span className="text-white/70">Base Price:</span>
                                                    <Badge className="bg-blue-500 text-white text-lg px-3 py-1">
                                                        ₹{currentPlayer.base_price} Cr
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-center">
                                            <div className="text-sm font-medium text-black/70 mb-2">CURRENT BID</div>
                                            <div className="text-5xl font-bold text-black mb-3">
                                                ₹{currentPlayer.current_bid} Cr
                                            </div>
                                            {currentPlayer.leading_team && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-black/70">Leading Team:</span>
                                                    <Badge className="bg-black text-white text-xl px-4 py-2">
                                                        {currentPlayer.leading_team}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <p className="text-2xl text-white/60">No active auction</p>
                                        <p className="text-white/40 mt-2">Waiting for next player...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Bidding History */}
                        <Card className="mt-6 bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-2xl">Bidding History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {biddingHistory.length > 0 ? (
                                        biddingHistory.map((bid) => (
                                            <div
                                                key={bid.id}
                                                className="bg-white/5 rounded-lg p-4 flex justify-between items-center hover:bg-white/10 transition-colors"
                                            >
                                                <div>
                                                    <div className="font-semibold">{bid.team}</div>
                                                    <div className="text-sm text-white/60">
                                                        {new Date(bid.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                                <Badge className="bg-green-500 text-black text-lg px-3 py-1">
                                                    ₹{bid.amount} Cr
                                                </Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-white/60 py-8">No bids yet</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Team Purse */}
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-xl">Team Purse</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {teams.map((team) => (
                                        <div
                                            key={team.id}
                                            className="bg-white/5 rounded-lg p-3 space-y-1"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-sm">{team.name}</span>
                                                <Badge
                                                    className={
                                                        team.purse_remaining > 50
                                                            ? 'bg-green-500 text-black'
                                                            : team.purse_remaining > 20
                                                                ? 'bg-yellow-500 text-black'
                                                                : 'bg-red-500 text-white'
                                                    }
                                                >
                                                    ₹{team.purse_remaining.toFixed(1)} Cr
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-white/60">
                                                {team.players_purchased} players
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Completed Players */}
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-xl">Sold Players</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {completedPlayers.length > 0 ? (
                                        completedPlayers.map((player) => (
                                            <div
                                                key={player.id}
                                                className="bg-white/5 rounded-lg p-3 space-y-1"
                                            >
                                                <div className="font-semibold text-sm">{player.name}</div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-white/60">{player.leading_team}</span>
                                                    <Badge className="bg-yellow-500 text-black">
                                                        ₹{player.current_bid} Cr
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-white/60 py-4 text-sm">
                                            No players sold yet
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
