import { ogImage, OG_SIZE } from '@/lib/ogImage';
import { trySquadSnapshot } from '@/lib/squadsServer';
import { summarize } from '@/lib/squads';

export const runtime = 'edge';
export const alt = 'IPL 2027 retained and released players — all 10 teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
    const snap = await trySquadSnapshot();
    const s = summarize(snap?.players ?? []);
    const started = s.retained.length + s.released.length > 0;
    return ogImage({
        eyebrow: 'IPL 2027 Retentions',
        title: 'Who stays, who goes: all 10 teams',
        stats: started
            ? [
                { label: 'Retained', value: String(s.retained.length), color: '#2fbf71' },
                { label: 'Released', value: String(s.released.length), color: '#e5484d' },
                { label: 'Awaiting', value: String(s.pending.length) },
            ]
            : [{ label: 'Lists drop', value: '17 Nov · 5 PM IST', color: '#f2b33d' }],
    });
}
