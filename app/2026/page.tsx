'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Radio } from 'lucide-react';
import { useTeams, useGlobalStats, useAllPlayers } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { formatCr, formatTime, purseTone } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Auction2026Page() {
  const { teams, loading: teamsLoading } = useTeams();
  const { stats, loading: statsLoading } = useGlobalStats();
  const { soldPlayers, unsoldPlayers, loading: playersLoading } = useAllPlayers();

  const [expandedSoldPlayer, setExpandedSoldPlayer] = useState<string | null>(null);
  const [soldPlayerBids, setSoldPlayerBids] = useState<{ [key: string]: any[] }>({});
  const [showSoldSection, setShowSoldSection] = useState(true);
  const [showUnsoldSection, setShowUnsoldSection] = useState(true);

  const toggleSoldPlayer = async (playerId: string) => {
    if (expandedSoldPlayer === playerId) {
      setExpandedSoldPlayer(null);
      return;
    }
    setExpandedSoldPlayer(playerId);
    if (!soldPlayerBids[playerId]) {
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

  if (teamsLoading || statsLoading || playersLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  const statTiles = [
    { label: 'Players sold', value: String(stats.totalSold), tone: 'text-foreground' },
    { label: 'Unsold', value: String(stats.totalUnsold), tone: 'text-foreground' },
    { label: 'Total spent', value: formatCr(stats.totalMoneySpent.toFixed(1)), tone: 'text-primary' },
    { label: 'Purse remaining', value: formatCr(stats.totalRemainingPurse.toFixed(1)), tone: 'text-foreground' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Archive
          </p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
            IPL 2026 Auction
          </h1>
        </div>
        <Button asChild size="lg">
          <Link href="/live">
            <Radio />
            Auction room
          </Link>
        </Button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {statTiles.map((tile) => (
          <div key={tile.label} className="bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {tile.label}
            </div>
            <div className={cn('mt-2 font-display text-3xl font-bold tabular-nums md:text-4xl', tile.tone)}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {(stats.mostExpensivePlayer || stats.teamWithHighestPurse) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {stats.mostExpensivePlayer && (
            <Card className="border-l-2 border-l-primary">
              <CardContent className="pt-5 md:pt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Most expensive buy
                </div>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-xl font-semibold">{stats.mostExpensivePlayer.name}</div>
                  <div className="font-display text-2xl font-bold tabular-nums text-primary">
                    {formatCr(stats.mostExpensivePlayer.current_bid)}
                  </div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stats.mostExpensivePlayer.leading_team}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.teamWithHighestPurse && (
            <Card className="border-l-2 border-l-success">
              <CardContent className="pt-5 md:pt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Biggest purse left
                </div>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-xl font-semibold">{stats.teamWithHighestPurse.name}</div>
                  <div className="font-display text-2xl font-bold tabular-nums text-success">
                    {formatCr(stats.teamWithHighestPurse.purse_remaining.toFixed(1))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Teams */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Teams</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/team/${encodeURIComponent(team.name)}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-input hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold">{team.name}</div>
                <div className={cn('font-display text-xl font-bold tabular-nums', purseTone(team.purse_remaining))}>
                  {formatCr(team.purse_remaining.toFixed(1))}
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Retained</dt>
                  <dd className="font-semibold tabular-nums">{team.players_retained}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Bought</dt>
                  <dd className="font-semibold tabular-nums">{team.players_purchased}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Squad</dt>
                  <dd className="font-semibold tabular-nums">
                    {team.players_retained + team.players_purchased}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </section>

      {/* Sold players */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowSoldSection(!showSoldSection)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              Sold players
              <Badge variant="secondary">{soldPlayers.length}</Badge>
            </CardTitle>
            <ChevronDown
              className={cn('h-5 w-5 text-muted-foreground transition-transform', showSoldSection && 'rotate-180')}
            />
          </button>
        </CardHeader>
        {showSoldSection && (
          <CardContent>
            <div className="scroll-thin max-h-[700px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {soldPlayers.length > 0 ? (
                soldPlayers.map((player) => (
                  <div key={player.id}>
                    <button
                      onClick={() => toggleSoldPlayer(player.id)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">{player.leading_team}</div>
                      </div>
                      <div className="font-display text-lg font-bold tabular-nums text-primary">
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
                      <div className="space-y-1 bg-background/60 px-4 py-3">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Bidding history
                        </div>
                        {soldPlayerBids[player.id] ? (
                          soldPlayerBids[player.id].length > 0 ? (
                            soldPlayerBids[player.id].map((bid: any) => (
                              <div key={bid.id} className="flex items-center justify-between py-1 text-sm">
                                <span>{bid.team}</span>
                                <span className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {formatTime(bid.timestamp)}
                                  </span>
                                  <span className="font-semibold tabular-nums">{formatCr(bid.amount)}</span>
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="py-1 text-sm text-muted-foreground">No bids recorded</p>
                          )
                        ) : (
                          <p className="py-1 text-sm text-muted-foreground">Loading…</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No players sold yet</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Unsold players */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowUnsoldSection(!showUnsoldSection)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              Unsold players
              <Badge variant="secondary">{unsoldPlayers.length}</Badge>
            </CardTitle>
            <ChevronDown
              className={cn('h-5 w-5 text-muted-foreground transition-transform', showUnsoldSection && 'rotate-180')}
            />
          </button>
        </CardHeader>
        {showUnsoldSection && (
          <CardContent>
            <div className="scroll-thin max-h-[500px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {unsoldPlayers.length > 0 ? (
                unsoldPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">Base {formatCr(player.base_price)}</div>
                    </div>
                    <Badge variant="destructive">Unsold</Badge>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No unsold players</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
