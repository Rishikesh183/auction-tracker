'use client';

import { useLiveStream } from '@/lib/useLiveStream';

/** Blinking "Watch live" pill. Renders nothing until an admin sets the stream link. */
export default function WatchLiveButton() {
    const { url } = useLiveStream();
    if (!url) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Watch the live stream"
            className="watch-live-btn inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1.5 sm:gap-2 sm:px-3 text-xs font-bold uppercase tracking-wider text-white sm:text-sm"
        >
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="hidden sm:inline">Watch live</span>
            <span className="sm:hidden">Live</span>
        </a>
    );
}
