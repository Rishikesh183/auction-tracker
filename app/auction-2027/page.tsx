'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AUCTION_2027_AT } from '@/lib/teams';
import { countdown, useNow } from '@/components/retention';

export default function Auction2027Page() {
    const now = useNow(1000);
    const c = now ? countdown(AUCTION_2027_AT, now) : null;

    const units = c
        ? [
            { label: 'Days', value: c.d },
            { label: 'Hours', value: c.h },
            { label: 'Minutes', value: c.m },
            { label: 'Seconds', value: c.s },
        ]
        : [];

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
            <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                Coming soon
            </span>
            <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-none tracking-wide md:text-7xl">
                IPL 2027 Auction
            </h1>
            <p className="mt-3 text-muted-foreground">16 December 2026 · every bid, live</p>

            <div className="mt-10 grid w-full max-w-lg grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border">
                {(units.length ? units : [{ label: 'Days', value: 0 }, { label: 'Hours', value: 0 }, { label: 'Minutes', value: 0 }, { label: 'Seconds', value: 0 }]).map((u) => (
                    <div key={u.label} className="bg-card py-5">
                        <div className="font-display text-4xl font-bold tabular-nums md:text-5xl">
                            {now ? String(u.value).padStart(2, '0') : '--'}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{u.label}</div>
                    </div>
                ))}
            </div>

            <p className="mt-10 text-sm text-muted-foreground">Meanwhile, see who each team kept and who is heading to the auction.</p>
            <div className="mt-4 flex gap-3">
                <Button asChild>
                    <Link href="/retention">Retentions &amp; releases</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/2026">2026 results</Link>
                </Button>
            </div>
        </div>
    );
}
