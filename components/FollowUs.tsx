'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { FaInstagram, FaUsers, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { LINKTREE_URL, SOCIAL_LINKS, type SocialKey } from '@/lib/socialLinks';
import { cn } from '@/lib/utils';

/** window.dispatchEvent(new Event(OPEN_FOLLOW)) opens the card from anywhere. */
export const OPEN_FOLLOW = 'cricmawa:open-follow';

const ICONS: Record<SocialKey, React.ComponentType<{ className?: string }>> = {
    instagram: FaInstagram,
    twitter: FaXTwitter,
    youtube: FaYoutube,
    'whatsapp-channel': FaWhatsapp,
    'whatsapp-group': FaUsers,
};

export function SocialIcon({ k, className }: { k: SocialKey; className?: string }) {
    const Icon = ICONS[k];
    return <Icon className={className} />;
}

export function openFollow() {
    window.dispatchEvent(new Event(OPEN_FOLLOW));
}

/** "Follow us" button with the Cricmawa logo. Opens the card. */
export function FollowButton({ className, label = 'Follow us' }: { className?: string; label?: string }) {
    return (
        <button
            onClick={openFollow}
            className={cn(
                'flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3.5 transition-colors hover:border-primary/60',
                className
            )}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cricmawa_logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
            <span className="text-xs font-semibold text-foreground">{label}</span>
        </button>
    );
}

function Card({ onClose }: { onClose: () => void }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Follow Cricmawa"
            className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-background shadow-2xl">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/20 to-transparent" />
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white"
                >
                    <X className="h-[18px] w-[18px]" />
                </button>

                <div className="relative flex flex-col items-center px-5 pb-5 pt-7 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/cricmawa_logo.png"
                        alt="Cricmawa"
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-full shadow-[0_0_28px_rgba(242,179,61,0.35)] ring-4 ring-primary/60"
                    />
                    <h2 className="mt-4 font-display text-3xl font-bold uppercase tracking-wide">Follow Cricmawa</h2>
                    <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                        For more cricket updates and content, follow <span className="font-semibold text-foreground">Cricmawa</span>.
                    </p>

                    <ul className="mt-5 flex w-full flex-col gap-2.5">
                        {SOCIAL_LINKS.map((l) => (
                            <li key={l.key}>
                                <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/60 hover:bg-muted/60"
                                >
                                    <span
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-white"
                                        style={{ background: l.bg }}
                                    >
                                        <SocialIcon k={l.key} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">{l.label}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{l.hint}</span>
                                    </span>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                                </a>
                            </li>
                        ))}
                    </ul>

                    <a
                        href={LINKTREE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
                    >
                        All links on Linktree
                    </a>
                    <button onClick={onClose} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Mounted once in the root layout. Never opens by itself - only from a Follow button. */
export default function FollowUs() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onOpen = () => setOpen(true);
        window.addEventListener(OPEN_FOLLOW, onOpen);
        return () => window.removeEventListener(OPEN_FOLLOW, onOpen);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return open ? <Card onClose={() => setOpen(false)} /> : null;
}
