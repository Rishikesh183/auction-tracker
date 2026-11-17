// Shared between the API route, the header button and the admin control.
export const LIVE_STREAM_KEY = 'live_stream_url';

/** Accept only plain http(s) links. Returns the normalised URL or null. */
export function cleanStreamUrl(v: unknown): string | null {
    const s = String(v ?? '').trim();
    if (!s || s.length > 500) return null;
    try {
        const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
        return u.toString();
    } catch {
        return null;
    }
}
