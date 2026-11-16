'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Filter, IndianRupee, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { uniqueChannelName } from '@/lib/realtime';
import { formatCr } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { RetainedPlayer, AuctionPurchase, TeamAnalytics } from '@/lib/teamTypes';

const TOTAL_PURSE = 130;

export default function TeamDashboardPage() {
    const params = useParams();
    const teamName = decodeURIComponent(params.teamName as string);

    const [retainedPlayers, setRetainedPlayers] = useState<RetainedPlayer[]>([]);
    const [auctionPurchases, setAuctionPurchases] = useState<AuctionPurchase[]>([]);
    const [analytics, setAnalytics] = useState<TeamAnalytics>({
        totalPurse: TOTAL_PURSE,
        purseRemaining: TOTAL_PURSE,
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

        const channel = supabase
            .channel(uniqueChannelName(`team_${teamName}`))
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'retained_players', filter: `team_name=eq.${teamName}` },
                () => fetchTeamData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'auction_purchases', filter: `team_name=eq.${teamName}` },
                () => fetchTeamData()
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'teams', filter: `name=eq.${teamName}` },
                () => fetchTeamData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamName]);

    const fetchTeamData = async () => {
        try {
            const [
                { data: retained, error: retainedError },
                { data: purchases, error: purchasesError },
                { data: teamData, error: teamError },
            ] = await Promise.all([
                supabase
                    .from('retained_players')
                    .select('*')
                    .eq('team_name', teamName)
                    .order('retained_amount', { ascending: false }),
                supabase
                    .from('auction_purchases')
                    .select('*')
                    .eq('team_name', teamName)
                    .order('purchased_at', { ascending: false }),
                supabase
                    .from('teams')
                    .select('purse_remaining')
                    .eq('name', teamName)
                    .single(),
            ]);

            if (retainedError) throw retainedError;
            if (purchasesError) throw purchasesError;
            if (teamError) throw teamError;

            setRetainedPlayers(retained || []);
            setAuctionPurchases(purchases || []);

            const retainedCount = retained?.length || 0;
            const purchasesCount = purchases?.length || 0;
            const retainedOverseas = retained?.filter(p => p.is_overseas).length || 0;
            const purchasedOverseas = purchases?.filter(p => p.is_overseas).length || 0;

            setAnalytics({
                totalPurse: TOTAL_PURSE,
                // ?? not ||: a purse of exactly 0 must show 0, not the full purse
                purseRemaining: Number(teamData?.purse_remaining ?? TOTAL_PURSE),
                totalPlayerLimit: 25,
                overseasLimit: 8,
                currentPlayersCount: retainedCount + purchasesCount,
                currentOverseasCount: retainedOverseas + purchasedOverseas,
                retainedPlayersCount: retainedCount,
                auctionPurchasesCount: purchasesCount,
            });
        } catch (error) {
            console.error('Error fetching team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const limitVariant = (current: number, limit: number) => {
        if (current > limit) return 'destructive' as const;
        if (current / limit >= 0.8) return 'warning' as const;
        return 'success' as const;
    };

    // Filtering Logic
    const filterPlayer = (player: RetainedPlayer | AuctionPurchase, amount: number) => {
        const matchesName = player.player_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || player.role === roleFilter;
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'overseas' ? player.is_overseas : !player.is_overseas);
        const minAmountVal = minAmount === '' ? 0 : Number(minAmount);
        return matchesName && matchesRole && matchesType && amount >= minAmountVal;
    };

    const filteredRetainedPlayers = retainedPlayers.filter(p => filterPlayer(p, Number(p.retained_amount)));
    const filteredAuctionPurchases = auctionPurchases.filter(p => filterPlayer(p, Number(p.auction_price)));

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                Loading team…
            </div>
        );
    }

    const spent = analytics.totalPurse - analytics.purseRemaining;
    const spentPct = Math.min(100, Math.max(0, (spent / analytics.totalPurse) * 100));

    const tables = [
        {
            title: 'Retained',
            amountLabel: 'Amount',
            rows: filteredRetainedPlayers.map(p => ({ id: p.id, name: p.player_name, amount: p.retained_amount, overseas: p.is_overseas, role: p.role })),
            emptyText: retainedPlayers.length === 0 ? 'No retained players' : 'No players match filters',
        },
        {
            title: 'Bought at auction',
            amountLabel: 'Price',
            rows: filteredAuctionPurchases.map(p => ({ id: p.id, name: p.player_name, amount: p.auction_price, overseas: p.is_overseas, role: p.role })),
            emptyText: auctionPurchases.length === 0 ? 'No auction purchases yet' : 'No players match filters',
        },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10">
            {/* Header */}
            <div>
                <Link
                    href="/live"
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to live
                </Link>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Squad</p>
                <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">{teamName}</h1>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="lg:col-span-2">
                    <CardContent className="pt-5 md:pt-6">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Purse remaining</div>
                                <div className="mt-1 font-display text-4xl font-bold tabular-nums text-primary">
                                    {formatCr(analytics.purseRemaining.toFixed(2))}
                                </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground tabular-nums">
                                of {formatCr(analytics.totalPurse)}
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${spentPct}%` }} />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                            {formatCr(spent.toFixed(2))} spent
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 md:pt-6">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Players</div>
                            <Badge variant={limitVariant(analytics.currentPlayersCount, analytics.totalPlayerLimit)}>
                                {analytics.totalPlayerLimit - analytics.currentPlayersCount} slots left
                            </Badge>
                        </div>
                        <div className="mt-1 font-display text-4xl font-bold tabular-nums">
                            {analytics.currentPlayersCount}
                            <span className="text-xl text-muted-foreground">/{analytics.totalPlayerLimit}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            {analytics.retainedPlayersCount} retained · {analytics.auctionPurchasesCount} bought
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 md:pt-6">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overseas</div>
                            <Badge variant={limitVariant(analytics.currentOverseasCount, analytics.overseasLimit)}>
                                {analytics.overseasLimit - analytics.currentOverseasCount} slots left
                            </Badge>
                        </div>
                        <div className="mt-1 font-display text-4xl font-bold tabular-nums">
                            {analytics.currentOverseasCount}
                            <span className="text-xl text-muted-foreground">/{analytics.overseasLimit}</span>
                        </div>
                        {analytics.currentOverseasCount > analytics.overseasLimit && (
                            <div className="mt-2 text-xs font-medium text-destructive">Over the overseas limit</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search players…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full sm:w-[170px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Role" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All roles</SelectItem>
                            {/* values must match the DB check constraint */}
                            <SelectItem value="Batsman">Batsman</SelectItem>
                            <SelectItem value="Bowler">Bowler</SelectItem>
                            <SelectItem value="All-rounder">All-rounder</SelectItem>
                            <SelectItem value="Wicket-keeper">Wicket-keeper</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All players</SelectItem>
                            <SelectItem value="indian">Indian</SelectItem>
                            <SelectItem value="overseas">Overseas</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative w-full sm:w-[160px]">
                        <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="number"
                            placeholder="Min price (Cr)"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="pl-9"
                            min="0"
                        />
                    </div>
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {tables.map((table) => (
                    <Card key={table.title}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {table.title}
                                <Badge variant="secondary">{table.rows.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                                            <th className="px-4 py-2.5 text-left font-medium">Player</th>
                                            <th className="px-4 py-2.5 text-left font-medium">Role</th>
                                            <th className="px-4 py-2.5 text-right font-medium">{table.amountLabel}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {table.rows.length > 0 ? (
                                            table.rows.map((row) => (
                                                <tr key={row.id} className="transition-colors hover:bg-muted/40">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{row.name}</span>
                                                            {row.overseas && (
                                                                <span title="Overseas" className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                                    OS
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">{row.role}</td>
                                                    <td className={cn('px-4 py-3 text-right font-semibold tabular-nums')}>
                                                        {formatCr(row.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                                                    {table.emptyText}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
