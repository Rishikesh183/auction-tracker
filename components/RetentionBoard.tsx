'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { useSquads } from '@/lib/useSquads';
import { summarize, type SquadPlayer } from '@/lib/squads';
import { TEAMS, RETENTION_LIVE_AT, getTeam } from '@/lib/teams';
import { Input } from '@/components/ui/input';
import PlayerAvatar from '@/components/PlayerAvatar';
import {
    PlayerRow,
    PlayerTags,
    SectionLabel,
    StatusPill,
    TeamChip,
    countdown,
    formatPrice,
    isFresh,
    useNow,
} from '@/components/retention';
import { cn } from '@/lib/utils';
import { BoardSkeleton } from '@/components/Skeletons';
import type { SquadSnapshot } from '@/lib/squadsServer';

type View = 'squads' | 'pool';

/** Players shown per team card before "View all". */
const PREVIEW = 7;

export default function RetentionBoard({ initial }: { initial?: SquadSnapshot | null }) {
    const now = useNow(1000);
    const { players, purses, loading, error, live } = useSquads({
        initial: initial ?? undefined,
        onPlayerChange: (next, prev) => {
        if (!next || !prev || next.status === prev.status) return;
        if (next.status === 'pending') return;
        const t = getTeam(next.team_code);
        const verb = next.status === 'retained' ? 'retain' : 'release';
        const fn = next.status === 'retained' ? toast.success : toast.error;
        fn(`${t?.code ?? next.team_code} ${verb} ${next.player_name}`, {
            description: formatPrice(next.price),
            duration: 3500,
        });
        },
    });

    const [view, setView] = useState<View>('squads');
    const [query, setQuery] = useState('');
    const [team, setTeam] = useState<string | null>(null);
    const [overseasOnly, setOverseasOnly] = useState(false);

    const q = query.trim().toLowerCase();
    const matches = (p: SquadPlayer) =>
        (!q || p.player_name.toLowerCase().includes(q)) &&
        (!overseasOnly || Boolean(p.country)) &&
        (!team || p.team_code === team);

    const all = useMemo(() => summarize(players), [players]);
    const teamsAnnounced = TEAMS.filter((t) => summarize(players.filter((p) => p.team_code === t.code)).announced).length;

    const latest = useMemo(
        () =>
            players
                .filter((p) => p.status !== 'pending' && p.status_changed_at)
                .sort((a, b) => b.status_changed_at!.localeCompare(a.status_changed_at!))
                .slice(0, 12),
        [players]
    );

    const pool = all.released.filter(matches).sort((a, b) => b.price - a.price || a.player_name.localeCompare(b.player_name));

    if (loading) {
        return <BoardSkeleton />;
    }
    if (error) {
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <h1 className="font-display text-3xl font-bold uppercase">Retentions coming soon</h1>
                <p className="mt-2 text-sm text-muted-foreground">Squads are not loaded yet. ({error})</p>
            </div>
        );
    }

    const cd = now ? countdown(RETENTION_LIVE_AT, now) : null;
    const isLive = cd?.done ?? false;
    const allIn = teamsAnnounced === TEAMS.length;

    return (
        <div className="mx-auto max-w-[1500px] px-4 py-8 md:px-8 md:py-10">
            <Toaster position="top-right" theme="dark" />

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">IPL 2027</p>
                    <h1 className="font-display text-4xl font-bold uppercase tracking-wide md:text-6xl">
                        Retentions <span className="text-primary">&amp;</span> Releases
                    </h1>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                    {allIn ? (
                        <span className="rounded-md bg-success/15 px-3 py-1 text-sm font-semibold text-success">All 10 lists are in</span>
                    ) : isLive ? (
                        <span className="flex items-center gap-2 rounded-md bg-destructive/15 px-3 py-1 text-sm font-semibold text-destructive">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                            </span>
                            Live now
                        </span>
                    ) : cd ? (
                        <div className="text-left md:text-right">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">Lists drop at 5:00 PM IST · 17 Nov</div>
                            <div className="font-display text-3xl font-bold tabular-nums">
                                {cd.d > 0 && `${cd.d}d `}
                                {String(cd.h).padStart(2, '0')}:{String(cd.m).padStart(2, '0')}:{String(cd.s).padStart(2, '0')}
                            </div>
                        </div>
                    ) : null}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span
                            className="flex items-center gap-1.5 text-xs"
                            title={live ? 'Live - updates within a few seconds' : 'Reconnecting - showing the last update'}
                        >
                            <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-success' : 'bg-warning')} />
                            {live ? 'Live' : 'Reconnecting'}
                        </span>
                        <span className="tabular-nums">
                            <b className="text-foreground">{teamsAnnounced}</b>/10 teams announced
                        </span>
                        <span className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                            <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${teamsAnnounced * 10}%` }} />
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
                {[
                    { label: 'Retained', value: String(all.retained.length), tone: 'text-success' },
                    { label: 'Released', value: String(all.released.length), tone: 'text-destructive' },
                    { label: 'Awaiting', value: String(all.pending.length), tone: 'text-foreground' },
                    { label: 'Spent on retentions', value: formatPrice(Math.round(all.retainedSpend * 100) / 100), tone: 'text-primary' },
                ].map((s) => (
                    <div key={s.label} className="bg-card p-4 md:p-5">
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
                        <div className={cn('mt-1 font-display text-3xl font-bold tabular-nums md:text-4xl', s.tone)}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Latest */}
            {latest.length > 0 && (
                <div className="mt-6">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Latest</div>
                    <div className="scroll-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
                        {latest.map((p) => (
                            <div
                                key={p.id}
                                className={cn(
                                    'flex w-60 shrink-0 items-center gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors duration-1000',
                                    isFresh(p, now) && (p.status === 'retained' ? 'border-success/50' : 'border-destructive/50')
                                )}
                            >
                                <PlayerAvatar photoKey={p.photo_key} name={p.player_name} className="h-10 w-10" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{p.player_name}</div>
                                    <div className="mt-0.5 flex items-center gap-1.5">
                                        <TeamChip code={p.team_code} />
                                        <StatusPill status={p.status} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="sticky top-14 z-30 -mx-4 mt-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="inline-flex shrink-0 self-start rounded-lg border border-border bg-card p-1">
                        {(
                            [
                                ['squads', 'Squads'],
                                ['pool', `Released pool · ${all.released.length}`],
                            ] as [View, string][]
                        ).map(([v, label]) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                                    view === v ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search a player…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
                    </div>
                    <button
                        onClick={() => setOverseasOnly(!overseasOnly)}
                        className={cn(
                            'h-10 shrink-0 rounded-md border px-3 text-sm font-medium transition-colors',
                            overseasOnly ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Overseas only
                    </button>
                </div>
                <div className="scroll-thin mt-3 flex gap-1.5 overflow-x-auto">
                    <button
                        onClick={() => setTeam(null)}
                        className={cn(
                            'shrink-0 rounded-md px-3 py-1 text-xs font-bold transition-opacity',
                            team === null ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                    >
                        ALL
                    </button>
                    {TEAMS.map((t) => (
                        <button
                            key={t.code}
                            onClick={() => setTeam(team === t.code ? null : t.code)}
                            className={cn(
                                'shrink-0 rounded-md px-3 py-1 text-xs font-bold transition-opacity',
                                team && team !== t.code ? 'opacity-40 hover:opacity-80' : 'opacity-100'
                            )}
                            style={{ background: t.color, color: t.fg }}
                        >
                            {t.code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Squads */}
            {view === 'squads' ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {TEAMS.filter((t) => !team || t.code === team).map((t) => {
                        const teamPlayers = players.filter((p) => p.team_code === t.code);
                        const sum = summarize(teamPlayers);
                        const visible = teamPlayers.filter(matches);
                        if ((q || overseasOnly) && visible.length === 0) return null;
                        const v = summarize(visible);
                        const purse = purses[t.code];
                        return (
                            <section key={t.code} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                                <div className="h-1" style={{ background: t.accent }} />
                                <Link
                                    href={`/retention/${t.code}`}
                                    className="group flex items-start justify-between gap-3 px-4 pb-3 pt-4 transition-colors hover:bg-muted/30"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <TeamChip code={t.code} />
                                            {sum.announced && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-success">List in</span>
                                            )}
                                        </div>
                                        <h2 className="mt-1.5 truncate font-display text-2xl font-bold uppercase leading-none tracking-wide">
                                            {t.name}
                                        </h2>
                                        <div className="mt-1 text-xs text-muted-foreground">Coach: {t.coach}</div>
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                                </Link>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 border-y border-border px-4 py-2 text-xs text-muted-foreground tabular-nums">
                                    <span>
                                        <b className="text-success">{sum.retained.length}</b> retained
                                    </span>
                                    <span>
                                        <b className="text-destructive">{sum.released.length}</b> released
                                    </span>
                                    {sum.pending.length > 0 && (
                                        <span>
                                            <b className="text-foreground">{sum.pending.length}</b> awaiting
                                        </span>
                                    )}
                                    <span className="ml-auto">
                                        Purse <b className="text-foreground">{purse == null ? 'TBA' : formatPrice(purse)}</b>
                                    </span>
                                </div>
                                {(() => {
                                    // Preview a few players; the full list lives on the team page.
                                    // While searching/filtering, show every match instead.
                                    const filtering = Boolean(q || overseasOnly);
                                    const byPrice = (list: SquadPlayer[]) =>
                                        [...list].sort((a, b) => b.price - a.price || a.sort_order - b.sort_order);
                                    const r = byPrice(v.retained);
                                    const x = byPrice(v.released);
                                    const pend = v.pending;
                                    let nr = r.length, nx = x.length, np = pend.length;
                                    if (!filtering) {
                                        nr = Math.min(r.length, x.length ? 4 : PREVIEW);
                                        nx = Math.min(x.length, PREVIEW - nr);
                                        nr = Math.min(r.length, PREVIEW - nx);
                                        np = Math.min(pend.length, PREVIEW - nr - nx);
                                    }
                                    const hidden = visible.length - nr - nx - np;
                                    return (
                                        <div className="flex flex-1 flex-col px-2 pb-2">
                                            {nr > 0 && (
                                                <>
                                                    <SectionLabel status="retained" count={r.length} />
                                                    <ul>{r.slice(0, nr).map((p) => <PlayerRow key={p.id} p={p} fresh={isFresh(p, now)} />)}</ul>
                                                </>
                                            )}
                                            {nx > 0 && (
                                                <>
                                                    <SectionLabel status="released" count={x.length} />
                                                    <ul>{x.slice(0, nx).map((p) => <PlayerRow key={p.id} p={p} fresh={isFresh(p, now)} />)}</ul>
                                                </>
                                            )}
                                            {np > 0 && (
                                                <>
                                                    {r.length + x.length > 0 ? (
                                                        <SectionLabel status="pending" count={pend.length} />
                                                    ) : (
                                                        <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                                            Current squad · {pend.length}
                                                        </div>
                                                    )}
                                                    <ul>{pend.slice(0, np).map((p) => <PlayerRow key={p.id} p={p} />)}</ul>
                                                </>
                                            )}
                                            <div className="mt-auto pt-2">
                                                <Link
                                                    href={`/retention/${t.code}`}
                                                    className="flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-input hover:text-foreground"
                                                >
                                                    {hidden > 0 ? `View all ${sum.total} players` : 'Open team page'}
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </section>
                        );
                    })}
                </div>
            ) : (
                /* Released pool */
                <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Players going back into the auction pool, sorted by last price.
                        </p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                            {pool.length} players · {formatPrice(Math.round(pool.reduce((s, p) => s + p.price, 0) * 100) / 100)} released
                        </p>
                    </div>
                    {pool.length > 0 ? (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                            {pool.map((p, i) => (
                                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                                    <PlayerAvatar photoKey={p.photo_key} name={p.player_name} className="h-9 w-9" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium">{p.player_name}</div>
                                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            ex <TeamChip code={p.team_code} />
                                            <PlayerTags p={p} />
                                        </div>
                                    </div>
                                    <span className="font-display text-lg font-bold tabular-nums">{formatPrice(p.price)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
                            {all.released.length === 0 ? 'No releases yet. They show up here live.' : 'No released players match.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
