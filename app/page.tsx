'use client';

import { useState } from 'react';
import { useTeams, useGlobalStats, useAllPlayers, useBiddingHistory } from '@/lib/realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const { teams, loading: teamsLoading } = useTeams();
  const { stats, loading: statsLoading } = useGlobalStats();
  const { soldPlayers, unsoldPlayers, loading: playersLoading } = useAllPlayers();

  const [expandedSoldPlayer, setExpandedSoldPlayer] = useState<string | null>(null);
  const [soldPlayerBids, setSoldPlayerBids] = useState<{ [key: string]: any[] }>({});
  const [showSoldSection, setShowSoldSection] = useState(true);
  const [showUnsoldSection, setShowUnsoldSection] = useState(true);

  const [teamOverseasCounts, setTeamOverseasCounts] = useState<{ [key: string]: number }>({});

  // Fetch overseas counts for teams
  useState(() => {
    const fetchOverseasCounts = async () => {
      const counts: { [key: string]: number } = {};

      for (const team of teams) {
        // Count overseas from retained players
        const { data: retained } = await supabase
          .from('retained_players')
          .select('*')
          .eq('team_name', team.name)
          .eq('is_overseas', true);

        // Count overseas from auction purchases
        const { data: purchases } = await supabase
          .from('auction_purchases')
          .select('*')
          .eq('team_name', team.name)
          .eq('is_overseas', true);

        counts[team.name] = (retained?.length || 0) + (purchases?.length || 0);
      }

      setTeamOverseasCounts(counts);
    };

    if (teams.length > 0) {
      fetchOverseasCounts();
    }
  });

  if (teamsLoading || statsLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
            IPL AUCTION TRACKER
          </h1>
          <p className="text-white/70 text-lg">Dashboard Overview</p>
        </div>

        {/* Live Auction Button */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/live')}
            className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white font-bold text-xl px-8 py-4 rounded-xl shadow-2xl hover:scale-105 transition-transform duration-300 animate-pulse"
          >
            🔴 GO TO LIVE AUCTION
          </button>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-green-400">{stats.totalSold}</div>
                <div className="text-sm text-white/70">Players Sold</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-red-400">{stats.totalUnsold}</div>
                <div className="text-sm text-white/70">Players Unsold</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-yellow-400">₹{stats.totalMoneySpent.toFixed(1)}</div>
                <div className="text-sm text-white/70">Total Spent (Cr)</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-blue-400">₹{stats.totalRemainingPurse.toFixed(1)}</div>
                <div className="text-sm text-white/70">Total Remaining (Cr)</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.mostExpensivePlayer && (
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg border-yellow-500/30 text-white">
              <CardHeader>
                <CardTitle className="text-lg">💰 Most Expensive Player</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{stats.mostExpensivePlayer.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500 text-black">
                      ₹{stats.mostExpensivePlayer.current_bid} Cr
                    </Badge>
                    <span className="text-white/70">{stats.mostExpensivePlayer.leading_team}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.teamWithHighestPurse && (
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg border-green-500/30 text-white">
              <CardHeader>
                <CardTitle className="text-lg">💵 Team with Highest Purse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{stats.teamWithHighestPurse.name}</div>
                  <Badge className="bg-green-500 text-black">
                    ₹{stats.teamWithHighestPurse.purse_remaining.toFixed(1)} Cr Remaining
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Team Statistics */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Team Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
                  <CardContent className="pt-4 space-y-3">
                    <div className="font-bold text-lg">{team.name}</div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Players Retained:</span>
                        <span className="font-semibold">{team.players_retained}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Players Bought:</span>
                        <span className="font-semibold">{team.players_purchased}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Players:</span>
                        <span className="font-semibold">{team.players_retained + team.players_purchased}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Overseas:</span>
                        <span className="font-semibold">{teamOverseasCounts[team.name] || 0}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-white/70">Purse Remaining:</span>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sold Players Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader>
            <button
              onClick={() => setShowSoldSection(!showSoldSection)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <CardTitle className="text-2xl">Sold Players ({soldPlayers.length})</CardTitle>
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${showSoldSection ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </CardHeader>
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${showSoldSection ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              }`}
          >
            <CardContent>
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {soldPlayers.length > 0 ? (
                  soldPlayers.map((player) => (
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
                            if (!soldPlayerBids[player.id]) {
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
                        className="w-full p-4 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{player.name}</div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-white/60 text-sm">{player.leading_team}</span>
                              <Badge className="bg-yellow-500 text-black">
                                ₹{player.current_bid} Cr
                              </Badge>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 ml-4 transition-transform duration-300 ${expandedSoldPlayer === player.id ? 'rotate-180' : ''
                              }`}
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
                        <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                          <div className="text-sm font-semibold text-white/80 mb-2">Bidding History:</div>
                          {soldPlayerBids[player.id] && soldPlayerBids[player.id].length > 0 ? (
                            soldPlayerBids[player.id].map((bid: any) => (
                              <div
                                key={bid.id}
                                className="bg-white/5 rounded p-3 flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-medium">{bid.team}</div>
                                  <div className="text-white/50 text-xs">
                                    {new Date(bid.timestamp).toLocaleTimeString()}
                                  </div>
                                </div>
                                <Badge className="bg-green-500 text-black">
                                  ₹{bid.amount} Cr
                                </Badge>
                              </div>
                            ))
                          ) : expandedSoldPlayer === player.id ? (
                            <p className="text-center text-white/50 py-2 text-sm">Loading...</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/60 py-8">No players sold yet</p>
                )}
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Unsold Players Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader>
            <button
              onClick={() => setShowUnsoldSection(!showUnsoldSection)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <CardTitle className="text-2xl">Unsold Players ({unsoldPlayers.length})</CardTitle>
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${showUnsoldSection ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </CardHeader>
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${showUnsoldSection ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}
          >
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {unsoldPlayers.length > 0 ? (
                  unsoldPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-white/5 rounded-lg p-4 border border-red-500/30"
                    >
                      <div className="font-semibold text-lg">{player.name}</div>
                      <div className="flex justify-between items-center mt-2">
                        <Badge className="bg-red-500 text-white">UNSOLD</Badge>
                        <span className="text-white/60 text-sm">Base: ₹{player.base_price} Cr</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/60 py-8">No unsold players</p>
                )}
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
