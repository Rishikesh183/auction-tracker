'use client';

import { ListPageSkeleton } from '@/components/Skeletons';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast, Toaster } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { useCurrentPlayer, useBiddingHistory, useTeams, useGlobalStats, uniqueChannelName } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCr, formatTime, purseTone } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function LivePage() {
    const { currentPlayer, loading: playerLoading } = useCurrentPlayer();
    const { biddingHistory, loading: historyLoading } = useBiddingHistory();
    const { teams, loading: teamsLoading } = useTeams();
    const { stats } = useGlobalStats();
    const [completedPlayers, setCompletedPlayers] = useState<any[]>([]);
    const [showCurrentPlayerHistory, setShowCurrentPlayerHistory] = useState(true);
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
    // Id of the newest bid already seen; null until the first history load.
    const lastSeenBidId = useRef<string | null | undefined>(undefined);

    // Show the live player
    useEffect(() => {
        if (!currentPlayer) return;
        if (currentPlayer.status === 'live') {
            setDisplayPlayer(currentPlayer);
        }
    }, [currentPlayer]);

    // SOLD animation - once per player
    useEffect(() => {
        if (
            currentPlayer &&
            currentPlayer.status === 'completed' &&
            currentPlayer.id !== lastAnimatedPlayerId
        ) {
            setLastAnimatedPlayerId(currentPlayer.id);
            localStorage.setItem('lastAnimatedPlayerId', currentPlayer.id);
            toast.success('Sold', {
                description: `${currentPlayer.name} to ${currentPlayer.leading_team} for ${formatCr(currentPlayer.current_bid)}`,
                duration: 4000,
            });

            setShowSoldAnimation(true);
            setDisplayPlayer(currentPlayer);

            // No cleanup: this effect re-runs when lastAnimatedPlayerId changes,
            // and clearing the timer there would leave the overlay up forever.
            setTimeout(() => {
                setShowSoldAnimation(false);
                setDisplayPlayer(null);
            }, 3000);
        }
    }, [currentPlayer, lastAnimatedPlayerId]);

    // UNSOLD animation - once per player
    useEffect(() => {
        if (
            currentPlayer &&
            currentPlayer.status === 'unsold' &&
            currentPlayer.id !== lastAnimatedPlayerId
        ) {
            setLastAnimatedPlayerId(currentPlayer.id);
            localStorage.setItem('lastAnimatedPlayerId', currentPlayer.id);

            toast.error('Unsold', {
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

    // Fetch completed and unsold players + keep them live
    useEffect(() => {
        let cancelled = false;
        let cleanup: (() => void) | undefined;

        (async () => {
            const { supabase } = await import('@/lib/supabaseClient');
            if (cancelled) return;

            const [{ data: completed }, { data: unsold }] = await Promise.all([
                supabase
                    .from('current_player')
                    .select('*')
                    .eq('status', 'completed')
                    .order('updated_at', { ascending: false }),
                supabase
                    .from('current_player')
                    .select('*')
                    .eq('status', 'unsold')
                    .order('updated_at', { ascending: false }),
            ]);
            if (cancelled) return;
            if (completed) setCompletedPlayers(completed);
            if (unsold) setUnsoldPlayers(unsold);

            const channel = supabase
                .channel(uniqueChannelName('player_status_changes'))
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'current_player' },
                    (payload: any) => {
                        const updatedPlayer = payload.new;
                        if (updatedPlayer.status === 'completed') {
                            setCompletedPlayers((prev) => [updatedPlayer, ...prev.filter((p) => p.id !== updatedPlayer.id)]);
                            setUnsoldPlayers((prev) => prev.filter((p) => p.id !== updatedPlayer.id));
                        } else if (updatedPlayer.status === 'unsold') {
                            setUnsoldPlayers((prev) => [updatedPlayer, ...prev.filter((p) => p.id !== updatedPlayer.id)]);
                            setCompletedPlayers((prev) => prev.filter((p) => p.id !== updatedPlayer.id));
                        }
                    }
                )
                .subscribe();
            cleanup = () => {
                supabase.removeChannel(channel);
            };
        })();

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, []);

    // Toast for each new bid (compare newest bid id; the list is capped at 50,
    // so its length stops changing once 50 bids exist)
    useEffect(() => {
        if (historyLoading) return;
        const newest = biddingHistory[0];
        const newestId = newest?.id ?? null;
        if (lastSeenBidId.current === undefined) {
            lastSeenBidId.current = newestId;
            return;
        }
        if (newest && newestId !== lastSeenBidId.current) {
            toast(`${newest.team} · ${formatCr(newest.amount)}`, {
                description: `New bid for ${newest.player_name}`,
                duration: 3000,
            });
        }
        lastSeenBidId.current = newestId;
    }, [biddingHistory, historyLoading]);

    const toggleSoldPlayer = async (playerId: string) => {
        if (expandedSoldPlayer === playerId) {
            setExpandedSoldPlayer(null);
            return;
        }
        setExpandedSoldPlayer(playerId);
        if (!soldPlayerBids[playerId]) {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data } = await supabase
                .from('bidding_history')
                .select('*')
                .eq('player_id', playerId)
                .order('timestamp', { ascending: false });
            if (data) {
                setSoldPlayerBids((prev) => ({ ...prev, [playerId]: data }));
            }
        }
    };

    if (playerLoading || historyLoading || teamsLoading) {
        return <ListPageSkeleton tiles={0} />;
    }

    const isLive = currentPlayer?.status === 'live';
    const playerBids = displayPlayer
        ? biddingHistory.filter((bid) => bid.player_id === displayPlayer.id)
        : [];
    const hasBids = playerBids.length > 0;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
            <Toaster position="top-right" theme="dark" />

            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        IPL Auction
                    </p>
                    <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                        Live
                    </h1>
                </div>
                {isLive ? (
                    <Badge variant="destructive" className="px-3 py-1 text-sm">
                        <span className="relative mr-1 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                        </span>
                        Bidding open
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                        Waiting for next player
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Current player */}
                <div className="space-y-6 lg:col-span-2">
                    {displayPlayer ? (
                        <Card className="relative overflow-hidden">
                            {/* SOLD overlay */}
                            {showSoldAnimation && displayPlayer.status === 'completed' && (
                                <div className="absolute inset-0 z-20 flex animate-fade-in flex-col items-center justify-center bg-background/95 text-center">
                                    <div className="animate-stamp rounded-lg border-4 border-success px-8 py-2 font-display text-7xl font-bold uppercase tracking-wider text-success md:text-8xl -rotate-3">
                                        Sold
                                    </div>
                                    <div className="mt-6 text-xl font-semibold">{displayPlayer.name}</div>
                                    <div className="mt-1 text-muted-foreground">{displayPlayer.leading_team}</div>
                                    <div className="mt-3 font-display text-5xl font-bold tabular-nums text-primary">
                                        {formatCr(displayPlayer.current_bid)}
                                    </div>
                                </div>
                            )}
                            {/* UNSOLD overlay */}
                            {showUnsoldAnimation && displayPlayer.status === 'unsold' && (
                                <div className="absolute inset-0 z-20 flex animate-fade-in flex-col items-center justify-center bg-background/95 text-center">
                                    <div className="animate-stamp rounded-lg border-4 border-destructive px-8 py-2 font-display text-7xl font-bold uppercase tracking-wider text-destructive md:text-8xl -rotate-3">
                                        Unsold
                                    </div>
                                    <div className="mt-6 text-xl font-semibold">{displayPlayer.name}</div>
                                    <div className="mt-1 text-muted-foreground">Base {formatCr(displayPlayer.base_price)}</div>
                                </div>
                            )}

                            <CardContent className="pt-5 md:pt-6">
                                <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                                    <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                                        {displayPlayer.photo_url ? (
                                            <Image
                                                src={displayPlayer.photo_url}
                                                alt={displayPlayer.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center font-display text-6xl font-bold text-muted-foreground">
                                                {displayPlayer.name?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-3 text-center md:text-left">
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                            On the block
                                        </div>
                                        <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-5xl">
                                            {displayPlayer.name}
                                        </h2>
                                        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                                            <Badge variant="outline" className="px-2.5 py-1 text-sm">
                                                Base {formatCr(displayPlayer.base_price)}
                                            </Badge>
                                            {displayPlayer.old_team && (
                                                <Badge variant="secondary" className="px-2.5 py-1 text-sm">
                                                    Previously {displayPlayer.old_team}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Current bid */}
                                <div className="mt-6 rounded-xl border border-primary/30 bg-primary/[0.06] p-5 md:p-6">
                                    {hasBids ? (
                                        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                    Current bid
                                                </div>
                                                <div
                                                    key={displayPlayer.current_bid}
                                                    className="animate-fade-in font-display text-6xl font-bold tabular-nums leading-none text-primary md:text-7xl"
                                                >
                                                    {formatCr(displayPlayer.current_bid)}
                                                </div>
                                            </div>
                                            {displayPlayer.leading_team && (
                                                <div className="sm:text-right">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                        Leading
                                                    </div>
                                                    <div className="font-display text-3xl font-bold uppercase tracking-wide">
                                                        {displayPlayer.leading_team}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center sm:text-left">
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                Waiting for first bid
                                            </div>
                                            <div className="font-display text-4xl font-bold tabular-nums text-foreground md:text-5xl">
                                                Starts at {formatCr(displayPlayer.base_price)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="flex min-h-[360px] items-center justify-center">
                            <CardContent className="max-w-md pt-5 text-center md:pt-6">
                                <h3 className="font-display text-3xl font-bold uppercase tracking-wide">
                                    No player on the block
                                </h3>
                                <p className="mt-2 text-muted-foreground">
                                    The next player shows up here the moment bidding opens. Results so far are on the results page.
                                </p>
                                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                                    <Button asChild>
                                        <Link href="/completed">View results</Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/2026">2026 dashboard</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Bidding history for current player */}
                    {displayPlayer && (
                        <Card>
                            <CardHeader>
                                <button
                                    onClick={() => setShowCurrentPlayerHistory(!showCurrentPlayerHistory)}
                                    className="flex w-full items-center justify-between"
                                >
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        Bidding history
                                        <Badge variant="secondary">{playerBids.length}</Badge>
                                    </CardTitle>
                                    <ChevronDown
                                        className={cn(
                                            'h-5 w-5 text-muted-foreground transition-transform',
                                            showCurrentPlayerHistory && 'rotate-180'
                                        )}
                                    />
                                </button>
                            </CardHeader>
                            {showCurrentPlayerHistory && (
                                <CardContent>
                                    {hasBids ? (
                                        <ol className="scroll-thin max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                                            {playerBids.map((bid, i) => (
                                                <li
                                                    key={bid.id}
                                                    className={cn(
                                                        'flex items-center justify-between px-4 py-3',
                                                        i === 0 && 'bg-primary/[0.06]'
                                                    )}
                                                >
                                                    <div>
                                                        <div className="font-medium">{bid.team}</div>
                                                        <div className="text-xs text-muted-foreground tabular-nums">
                                                            {formatTime(bid.timestamp)}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'font-display text-xl font-bold tabular-nums',
                                                            i === 0 ? 'text-primary' : 'text-foreground'
                                                        )}
                                                    >
                                                        {formatCr(bid.amount)}
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="py-8 text-center text-sm text-muted-foreground">
                                            No bids yet for this player
                                        </p>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Team purse */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Team purse</CardTitle>
                            <p className="text-xs text-muted-foreground">Tap a team to open its squad</p>
                        </CardHeader>
                        <CardContent>
                            <div className="scroll-thin max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                                {teams.map((team) => (
                                    <Link
                                        key={team.id}
                                        href={`/team/${encodeURIComponent(team.name)}`}
                                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">{team.name}</div>
                                            <div className="text-xs text-muted-foreground tabular-nums">
                                                {team.players_retained + team.players_purchased}/25 players
                                            </div>
                                        </div>
                                        <div className={cn('font-display text-lg font-bold tabular-nums', purseTone(team.purse_remaining))}>
                                            {formatCr(team.purse_remaining.toFixed(1))}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sold players */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                Sold
                                <Badge variant="secondary">{stats.totalSold}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="scroll-thin max-h-[600px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                                {completedPlayers.length > 0 ? (
                                    completedPlayers.map((player) => (
                                        <div key={player.id}>
                                            <button
                                                onClick={() => toggleSoldPlayer(player.id)}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">{player.name}</div>
                                                    <div className="truncate text-xs text-muted-foreground">{player.leading_team}</div>
                                                </div>
                                                <div className="text-sm font-semibold tabular-nums text-primary">
                                                    {formatCr(player.current_bid)}
                                                </div>
                                                <ChevronDown
                                                    className={cn(
                                                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                                        expandedSoldPlayer === player.id && 'rotate-180'
                                                    )}
                                                />
                                            </button>
                                            {expandedSoldPlayer === player.id && (
                                                <div className="scroll-thin max-h-72 space-y-1 overflow-y-auto bg-background/60 px-4 py-2">
                                                    {soldPlayerBids[player.id] ? (
                                                        soldPlayerBids[player.id].length > 0 ? (
                                                            soldPlayerBids[player.id].map((bid: any) => (
                                                                <div key={bid.id} className="flex items-center justify-between py-1 text-xs">
                                                                    <span>{bid.team}</span>
                                                                    <span className="font-semibold tabular-nums">{formatCr(bid.amount)}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="py-1 text-xs text-muted-foreground">No bids recorded</p>
                                                        )
                                                    ) : (
                                                        <p className="py-1 text-xs text-muted-foreground">Loading…</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="py-6 text-center text-sm text-muted-foreground">No players sold yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Unsold players */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                Unsold
                                <Badge variant="secondary">{stats.totalUnsold}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="scroll-thin max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                                {unsoldPlayers.length > 0 ? (
                                    unsoldPlayers.map((player) => (
                                        <div key={player.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="truncate text-sm font-medium">{player.name}</div>
                                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                                Base {formatCr(player.base_price)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="py-6 text-center text-sm text-muted-foreground">No unsold players</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
