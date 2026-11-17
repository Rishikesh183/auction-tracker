'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RETENTION_LIVE_AT } from '@/lib/teams';
import WatchLiveButton from '@/components/WatchLiveButton';

const links: { href: string; label: string; short?: string; match: string[] }[] = [
    { href: '/retention', label: 'Retention', match: ['/retention'] },
    { href: '/auction-2027', label: 'Auction 2027', short: 'Auction', match: ['/auction-2027'] },
    { href: '/2026', label: '2026', match: ['/2026', '/live', '/completed', '/team'] },
];

export default function SiteHeader() {
    const pathname = usePathname();
    const [retentionLive, setRetentionLive] = useState(false);

    useEffect(() => {
        const check = () => setRetentionLive(Date.now() >= RETENTION_LIVE_AT.getTime());
        check();
        const t = setInterval(check, 30000);
        return () => clearInterval(t);
    }, []);

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 md:px-8">
                <Link href="/" className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold tracking-wide text-foreground">CRICMAWA</span>
                    <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:inline">
                        IPL Live
                    </span>
                </Link>

                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <WatchLiveButton />
                <nav className="flex items-center gap-0.5 sm:gap-1">
                    {links.map((link) => {
                        const active = link.match.some((m) => pathname.startsWith(m));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:gap-2 sm:px-3',
                                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {link.href === '/retention' && retentionLive && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                                    </span>
                                )}
                                {link.short ? (
                                    <>
                                        <span className="sm:hidden">{link.short}</span>
                                        <span className="hidden sm:inline">{link.label}</span>
                                    </>
                                ) : (
                                    link.label
                                )}
                            </Link>
                        );
                    })}
                </nav>
                </div>
            </div>
        </header>
    );
}
