import type { MetadataRoute } from 'next';
import { TEAMS } from '@/lib/teams';
import { abs } from '@/lib/site';

export const revalidate = 300;

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: abs('/'), lastModified: now, changeFrequency: 'hourly', priority: 1 },
        { url: abs('/retention'), lastModified: now, changeFrequency: 'always', priority: 1 },
        ...TEAMS.map((t) => ({
            url: abs(`/retention/${t.code}`),
            lastModified: now,
            changeFrequency: 'always' as const,
            priority: 0.9,
        })),
        { url: abs('/auction-2027'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: abs('/2026'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: abs('/completed'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ];
}
