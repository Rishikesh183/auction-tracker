'use client';

import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import PlayerAvatar from '@/components/PlayerAvatar';
import { TeamChip, formatPrice } from '@/components/retention';
import { getTeam } from '@/lib/teams';
import type { Trade, TradeLeg } from '@/lib/squads';
import { cn } from '@/lib/utils';

/** One side of a trade: the players going TO `team`. */
function Side({ team, legs }: { team: string; legs: TradeLeg[] }) {
    const t = getTeam(team);
    return (
        <div className="min-w-0 flex-1 rounded-lg border border-border bg-background/40">
            <div
                className="flex items-center gap-2 rounded-t-lg border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                style={{ boxShadow: `inset 3px 0 0 ${t?.accent ?? '#555'}` }}
            >
                To <TeamChip code={team} />
                {legs.length > 0 && (
                    <span className="ml-auto tabular-nums normal-case tracking-normal">
                        {formatPrice(Math.round(legs.reduce((s, l) => s + l.price, 0) * 100) / 100)}
                    </span>
                )}
            </div>
            {legs.length > 0 ? (
                <ul className="divide-y divide-border">
                    {legs.map((l) => (
                        <li key={l.player_name} className="flex items-center gap-3 px-3 py-2.5">
                            <PlayerAvatar photoKey={l.photo_key} name={l.player_name} className="h-10 w-10" />
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{l.player_name}</div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    from <TeamChip code={l.from_team} />
                                    {l.country && <span className="text-[10px] font-medium">{l.country}</span>}
                                </div>
                            </div>
                            <span className="font-display text-lg font-bold tabular-nums">{formatPrice(l.price)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground">No players (cash deal)</div>
            )}
        </div>
    );
}

export function TradeCard({ trade, number, fresh }: { trade: Trade; number: number; fresh?: boolean }) {
    const toB = trade.legs.filter((l) => l.to_team === trade.team_b);
    const toA = trade.legs.filter((l) => l.to_team === trade.team_a);
    const oneWay = toA.length === 0 || toB.length === 0;
    // One-way: show it as seller -> buyer
    const [from, to] = oneWay && toB.length === 0 ? [trade.team_b, trade.team_a] : [trade.team_a, trade.team_b];

    return (
        <article
            className={cn(
                'overflow-hidden rounded-xl border bg-card transition-colors duration-1000',
                fresh ? 'border-[#a855f7]/60' : 'border-border'
            )}
        >
            <div className="flex h-1">
                <div className="flex-1" style={{ background: getTeam(from)?.accent }} />
                <div className="flex-1" style={{ background: getTeam(to)?.accent }} />
            </div>
            <header className="flex items-center gap-3 px-4 pt-3">
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">#{number}</span>
                <div className="flex items-center gap-2">
                    <TeamChip code={from} className="text-xs" />
                    {oneWay ? (
                        <ArrowRight className="h-4 w-4 text-[#d8b4fe]" aria-label="to" />
                    ) : (
                        <ArrowLeftRight className="h-4 w-4 text-[#d8b4fe]" aria-label="swapped with" />
                    )}
                    <TeamChip code={to} className="text-xs" />
                </div>
                <span className="ml-auto rounded bg-[#a855f7]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d8b4fe]">
                    {oneWay ? 'Transfer' : 'Swap'}
                </span>
            </header>
            <div className="flex flex-col gap-2 p-3 sm:flex-row">
                {oneWay ? (
                    <Side team={to} legs={trade.legs} />
                ) : (
                    <>
                        <Side team={trade.team_b} legs={toB} />
                        <Side team={trade.team_a} legs={toA} />
                    </>
                )}
            </div>
        </article>
    );
}

/** Trades, newest first. `numberOf` gives each trade's position in the full history (oldest = #1). */
export default function TradesView({
    trades,
    numberOf,
    isFresh,
    emptyText,
}: {
    trades: Trade[];
    numberOf: (t: Trade) => number;
    isFresh?: (t: Trade) => boolean;
    emptyText: string;
}) {
    if (trades.length === 0) {
        return <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">{emptyText}</div>;
    }
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {trades.map((t) => (
                <TradeCard key={t.id} trade={t} number={numberOf(t)} fresh={isFresh?.(t)} />
            ))}
        </div>
    );
}
