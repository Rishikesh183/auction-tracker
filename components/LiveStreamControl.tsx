'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLiveStream } from '@/lib/useLiveStream';

/** Admin card: set / clear the stream link that drives the header "Watch live" button. */
export default function LiveStreamControl({ onUnauthorized }: { onUnauthorized?: () => void }) {
    const { url, loaded, setUrl } = useLiveStream({ poll: false, fresh: true });
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (loaded) setInput(url ?? '');
    }, [loaded, url]);

    const save = async (next: string | null) => {
        setBusy(true);
        try {
            const res = await fetch('/api/live-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: next }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 401) onUnauthorized?.();
                throw new Error(data.error || `Request failed (${res.status})`);
            }
            setUrl(data.url ?? null);
            setInput(data.url ?? '');
            toast.success(data.url ? 'Live! "Watch live" button is now showing' : 'Live link removed, button hidden');
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="mt-6">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Radio className="h-3.5 w-3.5" />
                        Live stream link
                        {url ? (
                            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">ON AIR</span>
                        ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">OFF</span>
                        )}
                    </label>
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            save(input.trim() || null);
                        }}
                    >
                        <Input
                            type="url"
                            inputMode="url"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="https://youtube.com/live/..."
                            disabled={!loaded || busy}
                        />
                        <Button type="submit" size="sm" disabled={!loaded || busy || !input.trim() || input.trim() === url}>
                            {url ? 'Update' : 'Go live'}
                        </Button>
                    </form>
                </div>
                <div className="flex gap-2">
                    {url && (
                        <>
                            <Button asChild variant="outline" size="sm">
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink />
                                    Test
                                </a>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => confirm('Remove the live link? The "Watch live" button will disappear.') && save(null)}
                            >
                                Remove
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
