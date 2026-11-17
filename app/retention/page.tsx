import type { Metadata } from 'next';
import RetentionBoard from '@/components/RetentionBoard';
import { FaqSection, JsonLd } from '@/components/seo';
import { trySquadSnapshot } from '@/lib/squadsServer';
import { faqJsonLd, overallFaq, teamFaq } from '@/lib/retentionFaq';
import { summarize } from '@/lib/squads';
import { TEAMS } from '@/lib/teams';
import { SITE_NAME, abs } from '@/lib/site';

// Re-generated at most every 30 s (and immediately after admin changes)
export const revalidate = 30;

const TITLE = 'IPL 2027 Retentions & Releases: Full Retained and Released Players List (All 10 Teams)';
const DESCRIPTION =
    'IPL 2027 retention list live: every player retained and released by CSK, MI, RCB, KKR, SRH, GT, RR, PBKS, LSG and DC, prices, trades and purse left for the IPL 2027 auction on 16 December.';

export async function generateMetadata(): Promise<Metadata> {
    const snap = await trySquadSnapshot();
    const s = snap ? summarize(snap.players) : null;
    const live = s && s.retained.length + s.released.length > 0;
    return {
        title: TITLE,
        description: live
            ? `${s!.retainedOnly.length} retained, ${s!.released.length} released so far. ${DESCRIPTION}`
            : DESCRIPTION,
        alternates: { canonical: '/retention' },
        openGraph: {
            title: 'IPL 2027 Retentions & Releases — live',
            description: DESCRIPTION,
            url: abs('/retention'),
            type: 'website',
        },
        twitter: { card: 'summary_large_image', title: 'IPL 2027 Retentions & Releases — live', description: DESCRIPTION },
    };
}

export default async function RetentionPage() {
    const snap = await trySquadSnapshot();
    const players = snap?.players ?? [];
    const purses = Object.fromEntries((snap?.teams ?? []).map((t) => [t.team_code, t.purse]));

    const overall = overallFaq(players, purses, snap?.trades ?? []);
    const perTeam = TEAMS.flatMap((t) => teamFaq(t, players.filter((p) => p.team_code === t.code), purses[t.code] ?? null).slice(0, 2));
    const lastChange = players
        .map((p) => p.status_changed_at)
        .filter(Boolean)
        .sort()
        .pop();

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: TITLE,
            description: DESCRIPTION,
            url: abs('/retention'),
            inLanguage: 'en-IN',
            isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: abs('/') },
            ...(lastChange ? { dateModified: lastChange } : {}),
            about: { '@type': 'SportsEvent', name: 'IPL 2027 player retentions', startDate: '2026-11-17T18:00:00+05:30', sport: 'Cricket' },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'IPL 2027 retention lists by team',
            itemListElement: TEAMS.map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: `${t.name} retained and released players 2027`,
                url: abs(`/retention/${t.code}`),
            })),
        },
        faqJsonLd([...overall, ...perTeam]),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <RetentionBoard initial={snap} />
            <FaqSection id="faq" title="IPL 2027 retentions: quick answers" qas={[...overall, ...perTeam]} />
        </>
    );
}
