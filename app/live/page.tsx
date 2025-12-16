'use client';

import { useEffect, useState } from 'react';
import { useCurrentPlayer, useBiddingHistory, useTeams, useGlobalStats } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { toast, Toaster } from 'sonner';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';

export default function LivePage() {
    const { currentPlayer, loading: playerLoading } = useCurrentPlayer();
    const { biddingHistory, loading: historyLoading } = useBiddingHistory();
    const { teams, loading: teamsLoading } = useTeams();
    const { stats } = useGlobalStats();
    const [completedPlayers, setCompletedPlayers] = useState<any[]>([]);
    const [prevBidCount, setPrevBidCount] = useState(0);
    const [showCurrentPlayerHistory, setShowCurrentPlayerHistory] = useState(false);
    const [expandedSoldPlayer, setExpandedSoldPlayer] = useState<string | null>(null);
    const [soldPlayerBids, setSoldPlayerBids] = useState<{ [key: string]: any[] }>({});
    const [unsoldPlayers, setUnsoldPlayers] = useState<any[]>([]);
    const [showSoldAnimation, setShowSoldAnimation] = useState(false);
    const [displayPlayer, setDisplayPlayer] = useState<any | null>(null);
    const [showUnsoldAnimation, setShowUnsoldAnimation] = useState(false);
    const [lastAnimatedPlayerId, setLastAnimatedPlayerId] = useState<string | null>(
        typeof window !== 'undefined'
            ? localStorage.getItem('lastAnimatedPlayerId')
            : null
    );
    const [searchQuery, setSearchQuery] = useState('');

    const router = useRouter();

    // Initialize - mark already completed players as handled
    useEffect(() => {
        if (!currentPlayer) return;

        // Only LIVE players are shown normally
        if (currentPlayer.status === 'live') {
            setDisplayPlayer(currentPlayer);
        }
    }, [currentPlayer]);


    // Watch for player status changes (finalize/unsold) - ONLY ONCE per player
    useEffect(() => {
        if (
            currentPlayer &&
            currentPlayer.status === 'completed' &&
            currentPlayer.id !== lastAnimatedPlayerId
        ) {
            setLastAnimatedPlayerId(currentPlayer.id);
            localStorage.setItem('lastAnimatedPlayerId', currentPlayer.id);
            toast.success(`🎉 Player SOLD!`, {
                description: `${currentPlayer.name} sold to ${currentPlayer.leading_team} for ₹${currentPlayer.current_bid} Cr`,
                duration: 4000,
            });

            setShowSoldAnimation(true);
            setDisplayPlayer(currentPlayer); // show ONLY for animation

            setTimeout(() => {
                setShowSoldAnimation(false);
                setDisplayPlayer(null); // ✅ clear after animation
            }, 3000);
        }
    }, [currentPlayer, lastAnimatedPlayerId]);


    // Fetch completed and unsold players
    useEffect(() => {
        const fetchPlayers = async () => {
            const { supabase } = await import('@/lib/supabaseClient');

            // Fetch completed players
            const { data: completed } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'completed')
                .order('updated_at', { ascending: false })
                .limit(20);

            if (completed) {
                setCompletedPlayers(completed);
            }

            // Fetch unsold players
            const { data: unsold } = await supabase
                .from('current_player')
                .select('*')
                .eq('status', 'unsold')
                .order('updated_at', { ascending: false })
                .limit(20);

            if (unsold) {
                setUnsoldPlayers(unsold);
            }
        };

        fetchPlayers();

        // Subscribe to player status changes
        const setupSubscription = async () => {
            const { supabase } = await import('@/lib/supabaseClient');
            const channel = supabase
                .channel('player_status_changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'current_player',
                    },
                    (payload: any) => {
                        const updatedPlayer = payload.new;

                        if (updatedPlayer.status === 'completed') {
                            setCompletedPlayers((prev) => {
                                const filtered = prev.filter(p => p.id !== updatedPlayer.id);
                                return [updatedPlayer, ...filtered].slice(0, 20);
                            });
                            // Remove from unsold if it was there
                            setUnsoldPlayers((prev) => prev.filter(p => p.id !== updatedPlayer.id));
                        }
                        else if (updatedPlayer.status === 'unsold') {
                            setUnsoldPlayers((prev) => {
                                const filtered = prev.filter(p => p.id !== updatedPlayer.id);
                                return [updatedPlayer, ...filtered].slice(0, 20);
                            });
                            // Remove from completed if it was there
                            setCompletedPlayers((prev) => prev.filter(p => p.id !== updatedPlayer.id));
                            setDisplayPlayer(null); // 👈 IMPORTANT
                        }
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

    useEffect(() => {
        if (
            currentPlayer &&
            currentPlayer.status === 'unsold' &&
            currentPlayer.id !== lastAnimatedPlayerId
        ) {
            setLastAnimatedPlayerId(currentPlayer.id);
            localStorage.setItem('lastAnimatedPlayerId', currentPlayer.id); // ✅ ADD THIS

            toast.error(`❌ UNSOLD`, {
                description: `${currentPlayer.name} went unsold`,
                duration: 4000,
            });

            setShowUnsoldAnimation(true);
            setDisplayPlayer(currentPlayer);

            setTimeout(() => {
                setShowUnsoldAnimation(false);
                setDisplayPlayer(null);
            }, 3000);
        }
    }, [currentPlayer, lastAnimatedPlayerId]);



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
                                {displayPlayer ? (
                                    <div className="space-y-6 relative">
                                        {/* SOLD Animation Overlay */}
                                        {showSoldAnimation && displayPlayer.status === 'completed' && (
                                            <div className="absolute inset-0 z-50 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-xl flex flex-col items-center justify-center animate-pulse">
                                                <div className="text-6xl md:text-8xl font-bold text-white mb-4 animate-bounce">
                                                    SOLD!
                                                </div>
                                                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                                                    {displayPlayer.leading_team}
                                                </div>
                                                <div className="text-4xl md:text-5xl font-bold text-yellow-300">
                                                    ₹{displayPlayer.current_bid} Cr
                                                </div>
                                                <div className="mt-4 text-white/80 text-lg">
                                                    {displayPlayer.name}
                                                </div>
                                            </div>
                                        )}
                                        {showUnsoldAnimation && displayPlayer?.status === 'unsold' && (
                                            <div className="absolute inset-0 z-50 bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 rounded-xl flex flex-col items-center justify-center animate-pulse">
                                                <div className="text-6xl md:text-8xl font-bold text-white mb-4">
                                                    UNSOLD
                                                </div>
                                                <div className="text-2xl md:text-3xl font-semibold text-white/90">
                                                    {displayPlayer.name}
                                                </div>
                                                <div className="mt-2 text-white/70">
                                                    Base Price ₹{displayPlayer.base_price} Cr
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col md:flex-row gap-6 items-center">
                                            {displayPlayer.photo_url && (
                                                <div className="relative w-48 h-48 rounded-xl overflow-hidden border-4 border-yellow-400 shadow-2xl">
                                                    <Image
                                                        src={displayPlayer.photo_url}
                                                        alt={displayPlayer.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 space-y-4 text-center md:text-left">
                                                <h2 className="text-4xl font-bold">{displayPlayer.name}</h2>
                                                {displayPlayer.old_team && (
                                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                                        <span className="text-white/70">Previous Team:</span>
                                                        <Badge variant="secondary" className="text-lg px-3 py-1">
                                                            {displayPlayer.old_team}
                                                        </Badge>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                                    <span className="text-white/70">Base Price:</span>
                                                    <Badge className="bg-blue-500 text-white text-lg px-3 py-1">
                                                        ₹{displayPlayer.base_price} Cr
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-center">
                                            {biddingHistory.some(bid => bid.player_id === displayPlayer.id) ? (
                                                <>
                                                    <div className="text-sm font-medium text-black/70 mb-2">CURRENT BID</div>
                                                    <div className="text-5xl font-bold text-black mb-3">
                                                        ₹{displayPlayer.current_bid} Cr
                                                    </div>
                                                    {displayPlayer.leading_team && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-black/70">Leading Team:</span>
                                                            <Badge className="bg-black text-white text-xl px-4 py-2">
                                                                {displayPlayer.leading_team}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-sm font-medium text-black/70 mb-2">CURRENT PLAYER :<span className='font-bold text-xl capitalize text-black'>{displayPlayer.name}</span></div>
                                                    <div className="text-3xl font-bold text-black mb-3">
                                                        Waiting for first bid
                                                    </div>
                                                    <div className="text-sm text-black/60">
                                                        Starting at ₹{displayPlayer.base_price} Cr
                                                    </div>
                                                </>
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

                        {/* Bidding History - Collapsible for Current Player */}
                        {displayPlayer && (
                            <Card className="mt-6 bg-white/10 backdrop-blur-lg border-white/20 text-white">
                                <CardHeader>
                                    <button
                                        onClick={() => setShowCurrentPlayerHistory(!showCurrentPlayerHistory)}
                                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                                    >
                                        <CardTitle className="text-2xl">Bidding History - {displayPlayer.name}</CardTitle>
                                        <svg
                                            className={`w-6 h-6 transition-transform duration-300 ${showCurrentPlayerHistory ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </CardHeader>
                                <div
                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${showCurrentPlayerHistory ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <CardContent>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {biddingHistory.filter(bid => bid.player_id === displayPlayer.id).length > 0 ? (
                                                biddingHistory
                                                    .filter(bid => bid.player_id === displayPlayer.id)
                                                    .map((bid) => (
                                                        <div
                                                            key={bid.id}
                                                            className="bg-white/5 rounded-lg p-4 flex justify-between items-center hover:bg-white/10 transition-colors border border-white/10"
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
                                                <p className="text-center text-white/60 py-8">No bids yet for this player</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Team Purse */}
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-xl">Team Purse <span className="text-sm text-white/70">click on the team to open its dashboard</span></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {teams.map((team) => (
                                        <button
                                            key={team.id}
                                            onClick={() => router.push(`/team/${encodeURIComponent(team.name)}`)}
                                            className="bg-white/5 rounded-lg p-3 space-y-1 hover:bg-white/10 transition-colors cursor-pointer text-left w-full"
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
                                                {team.players_retained + team.players_purchased} players
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Search Players */}
                        {/* <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white mb-6">
                            <CardContent className="pt-6">
                                <Input
                                    placeholder="Search players..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                                />
                            </CardContent>
                        </Card> */}

                        {/* Completed Players with Collapsible History */}
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-xl">
                                    Sold Players
                                    <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-none">
                                        {stats.totalSold}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {completedPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                        completedPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((player) => (
                                            <div
                                                key={player.id}
                                                className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                                            >
                                                <button
                                                    onClick={async () => {
                                                        if (expandedSoldPlayer === player.id) {
                                                            setExpandedSoldPlayer(null);
                                                        } else {
                                                            setExpandedSoldPlayer(player.id);
                                                            // Fetch bidding history for this player if not already loaded
                                                            if (!soldPlayerBids[player.id]) {
                                                                const { supabase } = await import('@/lib/supabaseClient');
                                                                const { data } = await supabase
                                                                    .from('bidding_history')
                                                                    .select('*')
                                                                    .eq('player_id', player.id)
                                                                    .order('timestamp', { ascending: false });
                                                                if (data) {
                                                                    setSoldPlayerBids(prev => ({ ...prev, [player.id]: data }));
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className="w-full p-3 hover:bg-white/5 transition-colors text-left"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-sm">{player.name}</div>
                                                            <div className="flex justify-between items-center text-xs mt-1">
                                                                <span className="text-white/60">{player.leading_team}</span>
                                                                <Badge className="bg-yellow-500 text-black">
                                                                    ₹{player.current_bid} Cr
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <svg
                                                            className={`w-5 h-5 ml-2 transition-transform duration-300 ${expandedSoldPlayer === player.id ? 'rotate-180' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                                <div
                                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSoldPlayer === player.id ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                                                        }`}
                                                >
                                                    <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2">
                                                        {soldPlayerBids[player.id] && soldPlayerBids[player.id].length > 0 ? (
                                                            soldPlayerBids[player.id].map((bid: any) => (
                                                                <div
                                                                    key={bid.id}
                                                                    className="bg-white/5 rounded p-2 flex justify-between items-center text-xs"
                                                                >
                                                                    <div>
                                                                        <div className="font-medium">{bid.team}</div>
                                                                        <div className="text-white/50 text-[10px]">
                                                                            {new Date(bid.timestamp).toLocaleTimeString()}
                                                                        </div>
                                                                    </div>
                                                                    <Badge className="bg-green-500 text-black text-xs px-2 py-0.5">
                                                                        ₹{bid.amount} Cr
                                                                    </Badge>
                                                                </div>
                                                            ))
                                                        ) : expandedSoldPlayer === player.id ? (
                                                            <p className="text-center text-white/50 py-2 text-xs">Loading...</p>
                                                        ) : null}
                                                    </div>
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

                        {/* Unsold Players */}
                        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                            <CardHeader>
                                <CardTitle className="text-xl">
                                    Unsold Players
                                    <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-none">
                                        {stats.totalUnsold}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {unsoldPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                        unsoldPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((player) => (
                                            <div
                                                key={player.id}
                                                className="bg-white/5 rounded-lg p-3 space-y-1 border border-red-500/30"
                                            >
                                                <div className="font-semibold text-sm">{player.name}</div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <Badge className="bg-red-500 text-white">
                                                        UNSOLD
                                                    </Badge>
                                                    <span className="text-white/60">Base: ₹{player.base_price} Cr</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-white/60 py-4 text-sm">
                                            No unsold players
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
