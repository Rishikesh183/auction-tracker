import type { MetadataRoute } from 'next';
import { abs } from '@/lib/site';

// Allow search engines AND AI answer engines (they quote pages they can crawl).
export default function robots(): MetadataRoute.Robots {
    const disallow = ['/admin', '/api/'];
    return {
        rules: [
            { userAgent: '*', allow: '/', disallow },
            // Explicitly welcome AI crawlers (ChatGPT, Claude, Perplexity, Google AI, etc.)
            {
                userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'],
                allow: '/',
                disallow,
            },
        ],
        sitemap: abs('/sitemap.xml'),
    };
}
