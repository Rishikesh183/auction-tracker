'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getTeam } from '@/lib/teams';
import { displayStatus, type DisplayStatus, type SquadPlayer } from '@/lib/squads';
import PlayerAvatar from './PlayerAvatar';

/** ₹18 Cr / ₹30 L */
export function formatPrice(v: number): string {
    const n = Number(v);
    if (n > 0 && n < 1) return `₹${Math.round(n * 100)} L`;
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

/** Re-renders every `ms` so countdowns and "just now" highlights stay fresh. */
export function useNow(ms = 1000) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(t);
    }, [ms]);
    return now;
}

export function countdown(target: Date, now: number) {
    const s = Math.max(0, Math.floor((target.getTime() - now) / 1000));
    return {
        done: s === 0,
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
    };
}

export function TeamChip({ code, className, href }: { code: string; className?: string; href?: string }) {
    const t = getTeam(code);
    const chip = (
        <span
            className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide', className)}
            style={{ background: t?.color ?? '#333', color: t?.fg ?? '#fff' }}
        >
            {code}
        </span>
    );
    return href ? <Link href={href}>{chip}</Link> : chip;
}

export function PlayerTags({ p }: { p: SquadPlayer }) {
    return (
        <>
            {p.is_captain && <span className="rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">C</span>}
            {p.is_wk && <span className="rounded bg-[#3b82f6]/20 px-1 text-[10px] font-bold text-[#93c5fd]">WK</span>}
            {p.acquired_via === 'trade' && (
                <span className="rounded bg-[#a855f7]/20 px-1 text-[10px] font-bold text-[#d8b4fe]">TRADE</span>
            )}
            {p.country && <span className="text-[10px] font-medium text-muted-foreground">{p.country}</span>}
        </>
    );
}

export const STATUS_STYLE: Record<DisplayStatus, { label: string; text: string; bg: string; dot: string }> = {
    retained: { label: 'Retained', text: 'text-success', bg: 'bg-success/15', dot: 'bg-success' },
    released: { label: 'Released', text: 'text-destructive', bg: 'bg-destructive/15', dot: 'bg-destructive' },
    pending: { label: 'Awaiting', text: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
    traded: { label: 'Traded', text: 'text-[#d8b4fe]', bg: 'bg-[#a855f7]/20', dot: 'bg-[#a855f7]' },
};

export function StatusPill({ status, className }: { status: DisplayStatus; className?: string }) {
    const s = STATUS_STYLE[status];
    return (
        <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', s.bg, s.text, className)}>
            {s.label}
        </span>
    );
}

const FRESH_BG: Record<DisplayStatus, string> = {
    retained: 'bg-success/15',
    released: 'bg-destructive/15',
    traded: 'bg-[#a855f7]/15',
    pending: '',
};

/** One line in a squad list. `fresh` = changed in the last few seconds. */
export function PlayerRow({ p, fresh, showStatus }: { p: SquadPlayer; fresh?: boolean; showStatus?: boolean }) {
    const released = p.status === 'released';
    return (
        <li
            className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-1000',
                fresh && FRESH_BG[displayStatus(p)]
            )}
        >
            <PlayerAvatar photoKey={p.photo_key} name={p.player_name} className={cn('h-7 w-7', released && 'opacity-50 grayscale')} />
            <span className={cn('min-w-0 flex-1 truncate', released && 'text-muted-foreground')}>{p.player_name}</span>
            <span className="flex shrink-0 items-center gap-1">
                <PlayerTags p={p} />
            </span>
            {showStatus && <StatusPill status={displayStatus(p)} />}
            <span
                className={cn(
                    'w-14 shrink-0 text-right font-semibold tabular-nums',
                    released ? 'text-muted-foreground' : p.price >= 10 ? 'text-primary' : 'text-foreground'
                )}
            >
                {formatPrice(p.price)}
            </span>
        </li>
    );
}

export function SectionLabel({ status, count }: { status: DisplayStatus; count: number }) {
    const s = STATUS_STYLE[status];
    return (
        <div className="flex items-center gap-2 px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
            {status === 'traded' ? 'Traded in' : s.label}
            <span className="tabular-nums">{count}</span>
        </div>
    );
}

export function isFresh(p: SquadPlayer, now: number | null, windowMs = 12000) {
    return Boolean(now && p.status_changed_at && now - new Date(p.status_changed_at).getTime() < windowMs);
}
