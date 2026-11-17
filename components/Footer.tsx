'use client';

import { SOCIAL_LINKS } from '@/lib/socialLinks';
import { FollowButton, SocialIcon } from './FollowUs';

export default function Footer() {
    return (
        <footer className="mt-16 w-full border-t border-border">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row md:px-8">
                <p className="text-center text-xs text-muted-foreground sm:text-left">
                    © {new Date().getFullYear()} Cricmawa · made by fans, for fans
                </p>

                <div className="flex items-center gap-3">
                    <FollowButton />
                    <div className="flex items-center gap-1.5">
                        {SOCIAL_LINKS.map((l) => (
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
                </div>
            </div>
        </footer>
    );
}
