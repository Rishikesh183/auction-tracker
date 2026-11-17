'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSquads } from '@/lib/useSquads';
import { summarize } from '@/lib/squads';
import { TEAMS, getTeam, SQUAD_LIMIT, OVERSEAS_LIMIT } from '@/lib/teams';
import PlayerAvatar from '@/components/PlayerAvatar';
import { PlayerRow, PlayerTags, SectionLabel, TeamChip, formatPrice, isFresh, useNow } from '@/components/retention';
import { cn } from '@/lib/utils';
import { TeamSkeleton } from '@/components/Skeletons';
import type { SquadSnapshot } from '@/lib/squadsServer';

export default function RetentionTeamView({ code, initial }: { code: string; initial?: SquadSnapshot | null }) {
    const team = getTeam(code);
    const now = useNow(2000);
    const { players, purses, loading } = useSquads({ initial: initial ?? undefined });

    if (!team) {
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <h1 className="font-display text-3xl font-bold uppercase">Team not found</h1>
                <Link href="/retention" className="mt-4 inline-block text-sm text-primary hover:underline">
                    Back to retentions
                </Link>
            </div>
        );
    }
    if (loading) {
        return <TeamSkeleton />;
    }

    const sum = summarize(players.filter((p) => p.team_code === code));
    const purse = purses[code];

    const stats = [
        { label: 'Retained', value: String(sum.retained.length), tone: 'text-success' },
        { label: 'Released', value: String(sum.released.length), tone: 'text-destructive' },
        { label: 'Retention spend', value: formatPrice(Math.round(sum.retainedSpend * 100) / 100), tone: 'text-foreground' },
        { label: 'Auction purse', value: purse == null ? 'TBA' : formatPrice(purse), tone: 'text-primary' },
        { label: 'Slots left', value: `${Math.max(0, SQUAD_LIMIT - sum.retained.length)}`, tone: 'text-foreground' },
        { label: 'Overseas', value: `${sum.retainedOverseas}/${OVERSEAS_LIMIT}`, tone: 'text-foreground' },
    ];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
            <Link
                href="/retention"
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                All teams
            </Link>

            {/* Header */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="h-1.5" style={{ background: team.accent }} />
                <div className="flex flex-col gap-2 p-5 md:flex-row md:items-end md:justify-between md:p-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <TeamChip code={code} />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">IPL 2027 retention</span>
                        </div>
                        <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-6xl">
                            {team.name}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">Head coach: {team.coach}</p>
                    </div>
                    <div className={cn('text-sm font-semibold', sum.announced ? 'text-success' : 'text-muted-foreground')}>
                        {sum.announced ? 'Retention list announced' : `${sum.pending.length} players awaiting decision`}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
                    {stats.map((s) => (
                        <div key={s.label} className="bg-card px-5 py-4">
                            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
                            <div className={cn('mt-1 font-display text-2xl font-bold tabular-nums md:text-3xl', s.tone)}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Retained - photo cards */}
            <section className="mt-8">
                <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Retained
                    <span className="text-muted-foreground tabular-nums">{sum.retained.length}</span>
                </h2>
                {sum.retained.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {sum.retained.map((p) => (
                            <div
                                key={p.id}
                                className={cn(
                                    'overflow-hidden rounded-xl border bg-card transition-colors duration-1000',
                                    isFresh(p, now) ? 'border-success/60' : 'border-border'
                                )}
                            >
                                <div className="relative aspect-square bg-muted">
                                    <PlayerAvatar photoKey={p.photo_key} name={p.player_name} className="h-full w-full rounded-none" />
                                </div>
                                <div className="p-3">
                                    <div className="truncate text-sm font-semibold">{p.player_name}</div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1">
                                            <PlayerTags p={p} />
                                        </span>
                                        <span className={cn('text-sm font-bold tabular-nums', p.price >= 10 ? 'text-primary' : 'text-foreground')}>
                                            {formatPrice(p.price)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
                        No retentions announced yet
                    </div>
                )}
            </section>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-card p-2">
                    <SectionLabel status="released" count={sum.released.length} />
                    {sum.released.length > 0 ? (
                        <ul>{sum.released.map((p) => <PlayerRow key={p.id} p={p} fresh={isFresh(p, now)} />)}</ul>
                    ) : (
                        <p className="px-2 py-6 text-sm text-muted-foreground">No releases yet</p>
                    )}
                </section>
                <section className="rounded-xl border border-border bg-card p-2">
                    <SectionLabel status="pending" count={sum.pending.length} />
                    {sum.pending.length > 0 ? (
                        <ul>{sum.pending.map((p) => <PlayerRow key={p.id} p={p} />)}</ul>
                    ) : (
                        <p className="px-2 py-6 text-sm text-muted-foreground">Every player has a decision</p>
                    )}
                </section>
            </div>

            {/* Other teams */}
            <div className="mt-10 flex flex-wrap gap-1.5">
                {TEAMS.filter((t) => t.code !== code).map((t) => (
                    <TeamChip key={t.code} code={t.code} href={`/retention/${t.code}`} className="px-3 py-1 text-xs" />
                ))}
            </div>
        </div>
    );
}
