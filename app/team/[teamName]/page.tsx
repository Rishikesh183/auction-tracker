'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import type { RetainedPlayer, AuctionPurchase, TeamAnalytics } from '@/lib/teamTypes';

export default function TeamDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const teamName = decodeURIComponent(params.teamName as string);

    const [retainedPlayers, setRetainedPlayers] = useState<RetainedPlayer[]>([]);
    const [auctionPurchases, setAuctionPurchases] = useState<AuctionPurchase[]>([]);
    const [analytics, setAnalytics] = useState<TeamAnalytics>({
        totalPurse: 130,
        purseRemaining: 130,
        totalPlayerLimit: 25,
        overseasLimit: 8,
        currentPlayersCount: 0,
        currentOverseasCount: 0,
        retainedPlayersCount: 0,
        auctionPurchasesCount: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeamData();

        // Subscribe to realtime updates
        const retainedChannel = supabase
            .channel('retained_players_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'retained_players',
                    filter: `team_name=eq.${teamName}`,
                },
                () => {
                    fetchTeamData();
                }
            )
            .subscribe();

        const purchasesChannel = supabase
            .channel('auction_purchases_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'auction_purchases',
                    filter: `team_name=eq.${teamName}`,
                },
                () => {
                    fetchTeamData();
                }
            )
            .subscribe();

        const teamsChannel = supabase
            .channel('teams_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'teams',
                    filter: `name=eq.${teamName}`,
                },
                () => {
                    fetchTeamData();
                }
            )
            .subscribe();

        return () => {
            retainedChannel.unsubscribe();
            purchasesChannel.unsubscribe();
            teamsChannel.unsubscribe();
        };
    }, [teamName]);

    const fetchTeamData = async () => {
        try {
            // Fetch retained players
            const { data: retained, error: retainedError } = await supabase
                .from('retained_players')
                .select('*')
                .eq('team_name', teamName)
                .order('retained_amount', { ascending: false });

            if (retainedError) throw retainedError;

            // Fetch auction purchases
            const { data: purchases, error: purchasesError } = await supabase
                .from('auction_purchases')
                .select('*')
                .eq('team_name', teamName)
                .order('purchased_at', { ascending: false });

            if (purchasesError) throw purchasesError;

            // Fetch team purse
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('purse_remaining')
                .eq('name', teamName)
                .single();

            if (teamError) throw teamError;

            setRetainedPlayers(retained || []);
            setAuctionPurchases(purchases || []);

            // Calculate analytics
            const retainedCount = retained?.length || 0;
            const purchasesCount = purchases?.length || 0;
            const totalPlayers = retainedCount + purchasesCount;

            const retainedOverseas = retained?.filter(p => p.is_overseas).length || 0;
            const purchasedOverseas = purchases?.filter(p => p.is_overseas).length || 0;
            const totalOverseas = retainedOverseas + purchasedOverseas;

            const retainedSpent = retained?.reduce((sum, p) => sum + Number(p.retained_amount), 0) || 0;
            const purseRemaining = teamData?.purse_remaining || 130;

            setAnalytics({
                totalPurse: 130,
                purseRemaining: Number(purseRemaining),
                totalPlayerLimit: 25,
                overseasLimit: 8,
                currentPlayersCount: totalPlayers,
                currentOverseasCount: totalOverseas,
                retainedPlayersCount: retainedCount,
                auctionPurchasesCount: purchasesCount,
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching team data:', error);
            setLoading(false);
        }
    };

    const getIndicatorColor = (current: number, limit: number, type: 'players' | 'overseas') => {
        const percentage = (current / limit) * 100;
        if (current > limit) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-2xl animate-pulse">Loading team data...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button
                            onClick={() => router.back()}
                            variant="outline"
                            className="mb-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                            ← Back to Live
                        </Button>
                        <h1 className="text-4xl md:text-5xl font-bold text-white">{teamName}</h1>
                        <p className="text-white/70 mt-2">Team Dashboard</p>
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                    {/* Purse Card */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-white/70">Purse Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-white/60">Total Purse</div>
                                    <div className="text-2xl font-bold">₹{analytics.totalPurse} Cr</div>
                                </div>
                                <div>
                                    <div className="text-xs text-white/60">Remaining</div>
                                    <div className="text-2xl font-bold text-green-400">
                                        ₹{analytics.purseRemaining.toFixed(2)} Cr
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Players Count Card */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-white/70">Players</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/60">Current / Limit</span>
                                    <Badge className={`${getIndicatorColor(analytics.currentPlayersCount, analytics.totalPlayerLimit, 'players')} text-white`}>
                                        {analytics.currentPlayersCount} / {analytics.totalPlayerLimit}
                                    </Badge>
                                </div>
                                <div className="text-xs text-white/60">
                                    Retained: {analytics.retainedPlayersCount} | Bought: {analytics.auctionPurchasesCount}
                                </div>
                                {analytics.currentPlayersCount > analytics.totalPlayerLimit && (
                                    <div className="text-xs text-red-400 font-medium">⚠️ Exceeds limit!</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Overseas Count Card */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-white/70">Overseas Players</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/60">Current / Limit</span>
                                    <Badge className={`${getIndicatorColor(analytics.currentOverseasCount, analytics.overseasLimit, 'overseas')} text-white`}>
                                        {analytics.currentOverseasCount} / {analytics.overseasLimit}
                                    </Badge>
                                </div>
                                {analytics.currentOverseasCount > analytics.overseasLimit && (
                                    <div className="text-xs text-red-400 font-medium">⚠️ Exceeds limit!</div>
                                )}
                                {analytics.currentOverseasCount >= analytics.overseasLimit * 0.8 && analytics.currentOverseasCount <= analytics.overseasLimit && (
                                    <div className="text-xs text-yellow-400 font-medium">⚠️ Close to limit</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Card */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-white/70">Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-white/60">Slots Available:</span>
                                    <span className="font-medium">{analytics.totalPlayerLimit - analytics.currentPlayersCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/60">Overseas Slots:</span>
                                    <span className="font-medium">{analytics.overseasLimit - analytics.currentOverseasCount}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Retained Players Table */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl">Retained Players ({retainedPlayers.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/20">
                                            <th className="text-left py-3 px-2 text-sm font-semibold text-white/80">Player Name</th>
                                            <th className="text-right py-3 px-2 text-sm font-semibold text-white/80">Amount</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold text-white/80">Type</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold text-white/80">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {retainedPlayers.length > 0 ? (
                                            retainedPlayers.map((player) => (
                                                <tr key={player.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-2 text-sm font-medium">{player.player_name}</td>
                                                    <td className="py-3 px-2 text-right text-sm">₹{player.retained_amount} Cr</td>
                                                    <td className="py-3 px-2 text-center">
                                                        <Badge className={player.is_overseas ? 'bg-blue-500 text-white' : 'bg-green-500 text-black'}>
                                                            {player.is_overseas ? 'Overseas' : 'Indian'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-sm">{player.role}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-white/60">
                                                    No retained players
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auction Purchases Table */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl">Auction Purchases ({auctionPurchases.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/20">
                                            <th className="text-left py-3 px-2 text-sm font-semibold text-white/80">Player Name</th>
                                            <th className="text-right py-3 px-2 text-sm font-semibold text-white/80">Price</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold text-white/80">Type</th>
                                            <th className="text-center py-3 px-2 text-sm font-semibold text-white/80">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auctionPurchases.length > 0 ? (
                                            auctionPurchases.map((player) => (
                                                <tr key={player.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-2 text-sm font-medium">{player.player_name}</td>
                                                    <td className="py-3 px-2 text-right text-sm">₹{player.auction_price} Cr</td>
                                                    <td className="py-3 px-2 text-center">
                                                        <Badge className={player.is_overseas ? 'bg-blue-500 text-white' : 'bg-green-500 text-black'}>
                                                            {player.is_overseas ? 'Overseas' : 'Indian'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-sm">{player.role}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-white/60">
                                                    No auction purchases yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
