import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RetentionTeamView from '@/components/RetentionTeamView';
import { FaqSection, JsonLd } from '@/components/seo';
import { trySquadSnapshot } from '@/lib/squadsServer';
import { faqJsonLd, teamFaq } from '@/lib/retentionFaq';
import { summarize } from '@/lib/squads';
import { TEAMS, getTeam } from '@/lib/teams';
import { abs } from '@/lib/site';

export const revalidate = 30;
export const dynamicParams = false; // only the 10 team codes

export function generateStaticParams() {
    return TEAMS.map((t) => ({ team: t.code }));
}

export async function generateMetadata({ params }: { params: { team: string } }): Promise<Metadata> {
    const team = getTeam(params.team);
    if (!team) return {};
    const snap = await trySquadSnapshot();
    const s = summarize((snap?.players ?? []).filter((p) => p.team_code === team.code));
    const title = `${team.name} (${team.code}) Retained & Released Players 2027 – IPL 2027 Retention List`;
    const top = [...s.retained].sort((a, b) => b.price - a.price).slice(0, 4).map((p) => p.player_name);
    const description =
        s.retained.length + s.released.length > 0
            ? `${team.code} retained ${s.retained.length} and released ${s.released.length} for IPL 2027${top.length ? ` — retained: ${top.join(', ')}` : ''}. Full ${team.name} retention list, prices and purse for the IPL 2027 auction.`
            : `${team.name} IPL 2027 retention list, released players, prices and purse for the IPL 2027 auction. Live from 17 Nov, 5 PM IST.`;
    return {
        title,
        description,
        keywords: [
            `${team.code} retained players 2027`,
            `${team.name} retention list 2027`,
            `${team.code} released players 2027`,
            `${team.code} purse IPL 2027 auction`,
            `${team.name} squad 2027`,
        ],
        alternates: { canonical: `/retention/${team.code}` },
        openGraph: { title, description, url: abs(`/retention/${team.code}`), type: 'website' },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function RetentionTeamPage({ params }: { params: { team: string } }) {
    const team = getTeam(params.team);
    if (!team) notFound();

    const snap = await trySquadSnapshot();
    const players = (snap?.players ?? []).filter((p) => p.team_code === team.code);
    const purse = snap?.teams.find((t) => t.team_code === team.code)?.purse ?? null;
    const s = summarize(players);
    const qas = teamFaq(team, players, purse);

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
                { '@type': 'ListItem', position: 2, name: 'IPL 2027 Retentions', item: abs('/retention') },
                { '@type': 'ListItem', position: 3, name: team.name, item: abs(`/retention/${team.code}`) },
            ],
        },
        {
            '@context': 'https://schema.org',
            '@type': 'SportsTeam',
            name: team.name,
            alternateName: team.code,
            sport: 'Cricket',
            memberOf: { '@type': 'SportsOrganization', name: 'Indian Premier League' },
            coach: { '@type': 'Person', name: team.coach },
            athlete: s.retained.map((p) => ({ '@type': 'Person', name: p.player_name })),
        },
        faqJsonLd(qas),
    ];

    return (
        <>
            <JsonLd data={jsonLd} />
            <RetentionTeamView code={team.code} initial={snap} />
            <div className="mx-auto max-w-7xl">
                <FaqSection id="faq" title={`${team.code} retentions: quick answers`} qas={qas} />
            </div>
        </>
    );
}
