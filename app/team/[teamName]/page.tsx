'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import type { RetainedPlayer, AuctionPurchase, TeamAnalytics } from '@/lib/teamTypes';
import { Search, Filter, IndianRupee } from 'lucide-react';

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

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [minAmount, setMinAmount] = useState('');

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

    // Filtering Logic
    const filterPlayer = (player: any, amount: number) => {
        const matchesName = player.player_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || player.role === roleFilter;
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'overseas' ? player.is_overseas : !player.is_overseas);

        const minAmountVal = minAmount === '' ? 0 : Number(minAmount);
        const matchesAmount = amount >= minAmountVal;

        return matchesName && matchesRole && matchesType && matchesAmount;
    };

    const filteredRetainedPlayers = retainedPlayers.filter(p => filterPlayer(p, Number(p.retained_amount)));
    const filteredAuctionPurchases = auctionPurchases.filter(p => filterPlayer(p, Number(p.auction_price)));

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-2xl animate-pulse">Loading team data...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Filters & Search Section */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10 text-white">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search Bar */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                <Input
                                    placeholder="Search players..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-indigo-500"
                                />
                            </div>

                            {/* Filters Group */}
                            <div className="flex flex-col sm:flex-row gap-4 flex-[2]">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white w-full sm:w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-white/70" />
                                            <SelectValue placeholder="Role" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/20 text-white">
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="Batsman">Batsman</SelectItem>
                                        <SelectItem value="Bowler">Bowler</SelectItem>
                                        <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                                        <SelectItem value="Wicket Keeper">Wicket Keeper</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white w-full sm:w-[180px]">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/20 text-white">
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="indian">Indian</SelectItem>
                                        <SelectItem value="overseas">Overseas</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="relative w-full sm:w-[180px]">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                    <Input
                                        type="number"
                                        placeholder="Min Price (Cr)"
                                        value={minAmount}
                                        onChange={(e) => setMinAmount(e.target.value)}
                                        className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-indigo-500"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Retained Players Table */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white h-full">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl">Retained Players</CardTitle>
                                <Badge variant="secondary" className="bg-white/20 text-white pointer-events-none">
                                    {filteredRetainedPlayers.length}
                                </Badge>
                            </div>
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
                                    <tbody className="divide-y divide-white/10">
                                        {filteredRetainedPlayers.length > 0 ? (
                                            filteredRetainedPlayers.map((player) => (
                                                <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-2 text-sm font-medium text-white/90">{player.player_name}</td>
                                                    <td className="py-3 px-2 text-right text-sm">₹{player.retained_amount} Cr</td>
                                                    <td className="py-3 px-2 text-center">
                                                        <Badge className={player.is_overseas ? 'bg-blue-500/80 text-white border-none' : 'bg-green-500/80 text-white border-none'}>
                                                            {player.is_overseas ? 'OS' : 'IND'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-sm text-white/70">{player.role}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-white/60 italic">
                                                    {retainedPlayers.length === 0 ? 'No retained players found' : 'No players match filters'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auction Purchases Table */}
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white h-full">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl">Auction Purchases</CardTitle>
                                <Badge variant="secondary" className="bg-white/20 text-white pointer-events-none">
                                    {filteredAuctionPurchases.length}
                                </Badge>
                            </div>
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
                                    <tbody className="divide-y divide-white/10">
                                        {filteredAuctionPurchases.length > 0 ? (
                                            filteredAuctionPurchases.map((player) => (
                                                <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-2 text-sm font-medium text-white/90">{player.player_name}</td>
                                                    <td className="py-3 px-2 text-right text-sm">₹{player.auction_price} Cr</td>
                                                    <td className="py-3 px-2 text-center">
                                                        <Badge className={player.is_overseas ? 'bg-blue-500/80 text-white border-none' : 'bg-green-500/80 text-white border-none'}>
                                                            {player.is_overseas ? 'OS' : 'IND'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-sm text-white/70">{player.role}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-white/60 italic">
                                                    {auctionPurchases.length === 0 ? 'No auction purchases yet' : 'No players match filters'}
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
