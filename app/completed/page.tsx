'use client';

import { ListPageSkeleton } from '@/components/Skeletons';
import { useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTeams } from '@/lib/realtime';
import { formatCr, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CompletedAuctionPage() {
    const { teams } = useTeams();
    const [activeTab, setActiveTab] = useState<'sold' | 'unsold'>('sold');
    const [soldPlayers, setSoldPlayers] = useState<any[]>([]);
    const [unsoldPlayers, setUnsoldPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
    const [playerBids, setPlayerBids] = useState<{ [key: string]: any[] }>({});

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'high-to-low' | 'low-to-high' | 'a-z'>('high-to-low');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { supabase } = await import('@/lib/supabaseClient');

            const [{ data: sold }, { data: unsold }] = await Promise.all([
                supabase
                    .from('current_player')
                    .select('*')
                    .eq('status', 'completed')
                    .order('current_bid', { ascending: false }),
                supabase
                    .from('current_player')
                    .select('*')
                    .eq('status', 'unsold')
                    .order('base_price', { ascending: false }),
            ]);

            if (sold) setSoldPlayers(sold);
            if (unsold) setUnsoldPlayers(unsold);
            setLoading(false);
        };

        fetchData();
    }, []);

    const toggleHistory = async (playerId: string) => {
        if (expandedPlayer === playerId) {
            setExpandedPlayer(null);
            return;
        }

        setExpandedPlayer(playerId);
        if (!playerBids[playerId]) {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data } = await supabase
                .from('bidding_history')
                .select('*')
                .eq('player_id', playerId)
                .order('timestamp', { ascending: false });

            if (data) {
                setPlayerBids(prev => ({ ...prev, [playerId]: data }));
            }
        }
    };

    // Filter Logic
    const filteredSoldPlayers = soldPlayers
        .filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (selectedTeam === 'all' || p.leading_team === selectedTeam)
        )
        .sort((a, b) => {
            if (sortOrder === 'high-to-low') return b.current_bid - a.current_bid;
            if (sortOrder === 'low-to-high') return a.current_bid - b.current_bid;
            return a.name.localeCompare(b.name);
        });

    const filteredUnsoldPlayers = unsoldPlayers
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.base_price - a.base_price);

    if (loading) {
        return <ListPageSkeleton tiles={0} />;
    }

    const tabs = [
        { id: 'sold' as const, label: 'Sold', count: soldPlayers.length },
        { id: 'unsold' as const, label: 'Unsold', count: unsoldPlayers.length },
    ];

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    IPL Auction
                </p>
                <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                    Results
                </h1>
            </div>

            {/* Tabs + filters */}
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="inline-flex shrink-0 self-start rounded-lg border border-border bg-card p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors',
                                activeTab === tab.id
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab.label}
                            <span className="tabular-nums text-muted-foreground">{tab.count}</span>
                        </button>
                    ))}
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search players…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {activeTab === 'sold' && (
                    <div className="flex gap-3">
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="All teams" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All teams</SelectItem>
                                {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.name}>
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                            <SelectTrigger className="w-full sm:w-[170px]">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="high-to-low">Highest price</SelectItem>
                                <SelectItem value="low-to-high">Lowest price</SelectItem>
                                <SelectItem value="a-z">Name (A–Z)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {activeTab === 'sold' ? (
                    filteredSoldPlayers.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {filteredSoldPlayers.map((player, i) => (
                                <li key={player.id}>
                                    <button
                                        onClick={() => toggleHistory(player.id)}
                                        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 md:px-5"
                                    >
                                        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">{player.name}</div>
                                            <div className="truncate text-sm text-muted-foreground">{player.leading_team}</div>
                                        </div>
                                        <div className="font-display text-xl font-bold tabular-nums text-primary">
                                            {formatCr(player.current_bid)}
                                        </div>
                                        <ChevronDown
                                            className={cn(
                                                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                                expandedPlayer === player.id && 'rotate-180'
                                            )}
                                        />
                                    </button>

                                    {expandedPlayer === player.id && (
                                        <div className="border-t border-border bg-background/60 px-4 py-3 md:px-5 md:pl-14">
                                            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                Bidding history
                                            </div>
                                            <div className="scroll-thin max-h-60 space-y-1 overflow-y-auto pr-2">
                                                {playerBids[player.id] ? (
                                                    playerBids[player.id].length > 0 ? (
                                                        playerBids[player.id].map((bid) => (
                                                            <div key={bid.id} className="flex items-center justify-between py-1 text-sm">
                                                                <span>{bid.team}</span>
                                                                <span className="flex items-center gap-3">
                                                                    <span className="text-xs tabular-nums text-muted-foreground">
                                                                        {formatTime(bid.timestamp)}
                                                                    </span>
                                                                    <span className="font-semibold tabular-nums">{formatCr(bid.amount)}</span>
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-1 text-sm text-muted-foreground">No bids recorded</div>
                                                    )
                                                ) : (
                                                    <div className="py-1 text-sm text-muted-foreground">Loading…</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No players match your filters
                        </div>
                    )
                ) : filteredUnsoldPlayers.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {filteredUnsoldPlayers.map((player) => (
                            <li key={player.id} className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5">
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{player.name}</div>
                                    <div className="text-sm text-muted-foreground">Base {formatCr(player.base_price)}</div>
                                </div>
                                <Badge variant="destructive">Unsold</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">No unsold players found</div>
                )}
            </div>
        </div>
    );
}
