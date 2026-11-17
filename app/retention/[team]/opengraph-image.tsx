import { ogImage, OG_SIZE } from '@/lib/ogImage';
import { trySquadSnapshot } from '@/lib/squadsServer';
import { summarize } from '@/lib/squads';
import { TEAMS, getTeam } from '@/lib/teams';

export const runtime = 'edge';
export const alt = 'IPL 2027 retention list';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ team: string }> }) {
    const team = getTeam((await params).team) ?? TEAMS[0];
    const snap = await trySquadSnapshot();
    const s = summarize((snap?.players ?? []).filter((p) => p.team_code === team.code));
    const purse = snap?.teams.find((t) => t.team_code === team.code)?.purse;
    return ogImage({
        eyebrow: `${team.code} · IPL 2027 Retentions`,
        title: team.name,
        accent: team.accent,
        stats: [
            { label: 'Retained', value: String(s.retainedOnly.length), color: '#2fbf71' },
            { label: 'Released', value: String(s.released.length), color: '#e5484d' },
            ...(purse != null ? [{ label: 'Purse left', value: `₹${purse} Cr`, color: '#f2b33d' }] : []),
        ],
    });
}
