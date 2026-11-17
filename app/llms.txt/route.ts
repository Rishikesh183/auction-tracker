import { trySquadSnapshot } from '@/lib/squadsServer';
import { summarize } from '@/lib/squads';
import { TEAMS } from '@/lib/teams';
import { SITE_DESCRIPTION, abs } from '@/lib/site';

// /llms.txt — plain-text summary for AI assistants and answer engines
// (ChatGPT, Claude, Perplexity...). Always reflects the live lists.
export const revalidate = 60;

const cr = (n: number) => (n > 0 && n < 1 ? `₹${Math.round(n * 100)} lakh` : `₹${Number(n.toFixed(2))} crore`);

export async function GET() {
    const snap = await trySquadSnapshot();
    const players = snap?.players ?? [];
    const purses = Object.fromEntries((snap?.teams ?? []).map((t) => [t.team_code, t.purse]));
    const all = summarize(players);

    const lines: string[] = [
        '# Cricmawa IPL Live — IPL 2027 Retentions & Releases',
        '',
        `> ${SITE_DESCRIPTION}`,
        '',
        `Last updated: ${snap?.at ?? new Date().toISOString()}`,
        'Retention lists announced: 17 November 2026, 6:00 PM IST (deadline), streamed live on JioHotstar. IPL 2027 auction: 16 December 2026.',
        `Totals so far: ${all.retained.length} retained, ${all.released.length} released, ${all.pending.length} awaiting decision.`,
        '',
        '## Pages',
        `- [All teams: retained and released players](${abs('/retention')})`,
        ...TEAMS.map((t) => `- [${t.name} (${t.code}) retention list 2027](${abs(`/retention/${t.code}`)})`),
        `- [IPL 2027 auction date and countdown](${abs('/auction-2027')})`,
        `- [IPL 2026 auction results](${abs('/2026')})`,
        '',
    ];

    for (const t of TEAMS) {
        const s = summarize(players.filter((p) => p.team_code === t.code));
        const fmt = (list: typeof s.retained) =>
            [...list].sort((a, b) => b.price - a.price).map((p) => `${p.player_name} (${cr(p.price)}${p.country ? `, ${p.country}` : ''})`).join('; ') || 'none yet';
        lines.push(
            `## ${t.name} (${t.code})`,
            `Head coach: ${t.coach}. Auction purse: ${purses[t.code] != null ? cr(Number(purses[t.code])) : 'to be confirmed'}.`,
            `Retained (${s.retained.length}): ${fmt(s.retained)}`,
            `Released (${s.released.length}): ${fmt(s.released)}`,
            ...(s.pending.length ? [`Awaiting decision (${s.pending.length}): ${s.pending.map((p) => p.player_name).join('; ')}`] : []),
            ''
        );
    }

    return new Response(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        },
    });
}
