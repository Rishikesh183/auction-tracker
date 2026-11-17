'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSquads } from '@/lib/useSquads';
import { summarize } from '@/lib/squads';
import { TEAMS, RETENTION_LIVE_AT, AUCTION_2027_AT } from '@/lib/teams';
import { countdown, useNow } from '@/components/retention';
import { cn } from '@/lib/utils';
import { FollowButton, SocialIcon } from '@/components/FollowUs';
import { SOCIAL_LINKS } from '@/lib/socialLinks';

function Clock({ target, now }: { target: Date; now: number | null }) {
    if (!now) return <span className="opacity-0">00d 00:00:00</span>;
    const c = countdown(target, now);
    return (
        <span className="tabular-nums">
            {c.d > 0 && `${c.d}d `}
            {String(c.h).padStart(2, '0')}:{String(c.m).padStart(2, '0')}:{String(c.s).padStart(2, '0')}
        </span>
    );
}

export default function Home() {
    const now = useNow(1000);
    const { players, loading } = useSquads();

    const all = summarize(players);
    const announced = TEAMS.filter((t) => summarize(players.filter((p) => p.team_code === t.code)).announced).length;
    const retentionLive = now !== null && now >= RETENTION_LIVE_AT.getTime();
    const allIn = announced === TEAMS.length;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cricmawa</p>
            <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-wide md:text-7xl">
                IPL 2027 <span className="text-primary">Live</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
                Retentions, releases and the auction, updated live as it happens.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Retention */}
                <Link
                    href="/retention"
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-6 transition-colors hover:border-input lg:col-span-2"
                >
                    <div className="flex items-center justify-between">
                        {allIn ? (
                            <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
                                All lists in
                            </span>
                        ) : retentionLive ? (
                            <span className="flex items-center gap-2 rounded bg-destructive/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-destructive">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                                Live now
                            </span>
                        ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                17 Nov · 6:00 PM IST
                            </span>
                        )}
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>
                    <h2 className="mt-6 font-display text-4xl font-bold uppercase tracking-wide md:text-5xl">
                        Retentions &amp; releases
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                        Every squad, who stays and who goes back into the pool.
                    </p>
                    <div className="mt-auto grid grid-cols-3 gap-4 pt-8">
                        {retentionLive || allIn ? (
                            [
                                { label: 'Retained', value: all.retained.length, tone: 'text-success' },
                                { label: 'Released', value: all.released.length, tone: 'text-destructive' },
                                { label: 'Teams in', value: `${announced}/10`, tone: 'text-foreground' },
                            ].map((s) => (
                                <div key={s.label}>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                                    <div className={cn('font-display text-3xl font-bold tabular-nums', s.tone)}>
                                        {loading ? '–' : s.value}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground">Starts in</div>
                                <div className="font-display text-4xl font-bold">
                                    <Clock target={RETENTION_LIVE_AT} now={now} />
                                </div>
                            </div>
                        )}
                    </div>
                </Link>

                {/* Auction 2027 */}
                <Link
                    href="/auction-2027"
                    className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-input"
                >
                    <div className="flex items-center justify-between">
                        <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                            Coming soon
                        </span>
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>
                    <h2 className="mt-6 font-display text-4xl font-bold uppercase tracking-wide">IPL 2027 Auction</h2>
                    <p className="mt-2 text-muted-foreground">16 December · live bid by bid</p>
                    <div className="mt-auto pt-8">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Starts in</div>
                        <div className="font-display text-3xl font-bold">
                            <Clock target={AUCTION_2027_AT} now={now} />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Archive */}
            <Link
                href="/2026"
                className="group mt-4 flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4 transition-colors hover:border-input"
            >
                <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Archive</div>
                    <div className="font-semibold">IPL 2026 Auction results</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </Link>

            {/* Follow */}
            <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card px-6 py-4 sm:flex-row sm:items-center">
                <div>
                    <div className="font-semibold">Follow Cricmawa</div>
                    <div className="text-sm text-muted-foreground">Retention reactions, auction breakdowns and daily cricket updates.</div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        {SOCIAL_LINKS.slice(0, 4).map((l) => (
                            <a
                                key={l.key}
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={l.label}
                                title={l.label}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white opacity-90 transition hover:scale-110 hover:opacity-100"
                                style={{ background: l.bg }}
                            >
                                <SocialIcon k={l.key} />
                            </a>
                        ))}
                    </div>
                    <FollowButton label="All links" />
                </div>
            </div>
        </div>
    );
}
