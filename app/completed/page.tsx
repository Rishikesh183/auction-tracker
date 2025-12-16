'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTeams } from '@/lib/realtime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CompletedAuctionPage() {
    const router = useRouter();
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

            // Fetch Sold Players
            const { data: sold } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'completed')
                .order('current_bid', { ascending: false }); // Default sort

            if (sold) setSoldPlayers(sold);

            // Fetch Unsold Players
            const { data: unsold } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'unsold')
                .order('base_price', { ascending: false });

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
        .sort((a, b) => b.base_price - a.base_price); // Default base price sort for unsold

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-2xl animate-pulse">Loading results...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Auction Results</h1>
                        <p className="text-white/60">Complete list of sold and unsold players</p>
                    </div>
                    <button
                        onClick={() => router.push('/live')}
                        className="text-white/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        Back to Live
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('sold')}
                        className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${activeTab === 'sold'
                            ? 'bg-white text-blue-900 shadow-xl scale-105'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                    >
                        SOLD PLAYERS ({soldPlayers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('unsold')}
                        className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${activeTab === 'unsold'
                            ? 'bg-white text-blue-900 shadow-xl scale-105'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                    >
                        UNSOLD PLAYERS ({unsoldPlayers.length})
                    </button>
                </div>

                {/* Filters */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white mb-8">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search players..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 h-10"
                                />
                            </div>
                            {activeTab === 'sold' && (
                                <>
                                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                        <SelectTrigger className="bg-white/10 text-white border border-white/30 h-10 w-[220px]">
                                            <SelectValue placeholder="All Teams" />
                                        </SelectTrigger>

                                        <SelectContent className="bg-indigo-950 text-white border border-white/20">
                                            <SelectItem value="all">All Teams</SelectItem>
                                            {teams.map(team => (
                                                <SelectItem
                                                    key={team.id}
                                                    value={team.name}
                                                    className="focus:bg-indigo-800"
                                                >
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                                        <SelectTrigger className="bg-white/10 text-white border border-white/30 h-10 w-[200px]">
                                            <SelectValue placeholder="Sort by Price" />
                                        </SelectTrigger>

                                        <SelectContent className="bg-indigo-950 text-white border border-white/20">
                                            <SelectItem
                                                value="high-to-low"
                                                className="focus:bg-indigo-800"
                                            >
                                                Highest Price
                                            </SelectItem>

                                            <SelectItem
                                                value="low-to-high"
                                                className="focus:bg-indigo-800"
                                            >
                                                Lowest Price
                                            </SelectItem>

                                            <SelectItem
                                                value="a-z"
                                                className="focus:bg-indigo-800"
                                            >
                                                Name (A–Z)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Content */}
                <div className="space-y-4">
                    {activeTab === 'sold' ? (
                        filteredSoldPlayers.length > 0 ? (
                            filteredSoldPlayers.map((player) => (
                                <div
                                    key={player.id}
                                    className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden hover:bg-white/15 transition-colors"
                                >
                                    <div
                                        onClick={() => toggleHistory(player.id)}
                                        className="p-4 flex flex-col md:flex-row items-center justify-between cursor-pointer gap-4"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Avatar Placeholder */}
                                            <div className="w-12 h-12 rounded-full text-white bg-white/20 flex items-center justify-center text-xl font-bold">
                                                {player.name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-white">{player.name}</h3>
                                                <div className="text-green-500 text-sm">Sold to {player.leading_team}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <Badge className="bg-green-500 text-black text-lg px-4 py-1">
                                                ₹{player.current_bid} Cr
                                            </Badge>
                                            <svg
                                                className={`w-6 h-6 transition-transform duration-300 ${expandedPlayer === player.id ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Expanded History */}
                                    <div
                                        className={`transition-all duration-300 ease-in-out bg-black/20 ${expandedPlayer === player.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                            } overflow-hidden`}
                                    >
                                        <div className="p-4 border-t border-white/10">
                                            <h4 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">Bidding History</h4>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                {playerBids[player.id]?.length > 0 ? (
                                                    playerBids[player.id].map((bid) => (
                                                        <div key={bid.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-white/5">
                                                            <span className="font-medium text-white/90">{bid.team}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-white/50 text-xs">{new Date(bid.timestamp).toLocaleTimeString()}</span>
                                                                <Badge variant="outline" className="border-white/20 text-white">
                                                                    ₹{bid.amount} Cr
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-white/40 text-sm text-center py-2">Loading history...</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-white/50">No players found matching your filters</div>
                        )
                    ) : (
                        // UNSOLD TAB
                        filteredUnsoldPlayers.length > 0 ? (
                            filteredUnsoldPlayers.map((player) => (
                                <div
                                    key={player.id}
                                    className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col md:flex-row items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-xl font-bold text-white border border-red-500/30">
                                            {player.name[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white/80">{player.name}</h3>
                                            <div className="text-red-400 text-sm font-semibold">UNSOLD</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1 rounded-lg">
                                        <span className="text-sm">Base Price</span>
                                        <span className="font-bold text-white">₹{player.base_price} Cr</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-white/50">No unsold players found</div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
