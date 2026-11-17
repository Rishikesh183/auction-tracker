'use client';

import { useCallback, useEffect, useState } from 'react';

const POLL_MS = 20_000;

/** Current live stream link (null = not live). Polls so the button appears without a reload. */
export function useLiveStream({ poll = true, fresh = false } = {}) {
    const [url, setUrl] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const reload = useCallback(async () => {
        try {
            const r = await fetch(fresh ? `/api/live-stream?t=${Date.now()}` : '/api/live-stream', { cache: 'no-store' });
            if (r.ok) setUrl((await r.json()).url ?? null);
        } catch {
            /* keep last value */
        } finally {
            setLoaded(true);
        }
    }, [fresh]);

    useEffect(() => {
        reload();
        if (!poll) return;
        const t = setInterval(() => {
            if (document.visibilityState === 'visible') reload();
        }, POLL_MS);
        const onVis = () => document.visibilityState === 'visible' && reload();
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(t);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [reload, poll]);

    return { url, loaded, setUrl, reload };
}
