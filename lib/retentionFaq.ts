// Plain-language Q&A built from live squad data. Rendered visibly on the page
// AND as FAQPage JSON-LD, so search engines / answer engines (Google AI
// Overviews, ChatGPT search, Perplexity) can quote direct answers.
import { byTradeSeq, summarize, type SquadPlayer, type Trade } from './squads';
import { TEAMS, getTeam, type TeamMeta } from './teams';

export interface QA {
    q: string;
    a: string;
}

const fmt = (n: number) =>
    n > 0 && n < 1 ? `₹${Math.round(n * 100)} lakh` : `₹${Number(n.toFixed(2)).toLocaleString('en-IN')} crore`;

const names = (list: SquadPlayer[], withPrice = true, max = 40) => {
    const shown = list.slice(0, max).map((p) => (withPrice ? `${p.player_name} (${fmt(p.price)})` : p.player_name));
    const rest = list.length - shown.length;
    return shown.join(', ') + (rest > 0 ? ` and ${rest} more` : '');
};

const byPriceDesc = (list: SquadPlayer[]) => [...list].sort((a, b) => b.price - a.price);

const RETENTION_DATE = '17 November 2026, 6:00 PM IST';
const STREAM = 'JioHotstar';
const AUCTION_DATE = '16 December 2026';

export function teamFaq(team: TeamMeta, players: SquadPlayer[], purse: number | null): QA[] {
    const s = summarize(players);
    const started = s.retained.length + s.released.length > 0;
    const short = team.code;
    const out: QA[] = [];

    out.push({
        q: `Who has ${team.name} (${short}) retained for IPL 2027?`,
        a: s.retained.length
            ? `${team.name} have retained ${s.retained.length} player${s.retained.length === 1 ? '' : 's'} for IPL 2027: ${names(byPriceDesc(s.retained))}.` +
            (s.pending.length ? ` ${s.pending.length} more decisions are still awaited.` : '')
            : started
                ? `${team.name} have not retained any players yet; ${s.pending.length} decisions are still awaited.`
                : `${team.name}'s IPL 2027 retention list will be announced on ${RETENTION_DATE}. Their current squad has ${s.total} players.`,
    });

    out.push({
        q: `Which players did ${short} release before the IPL 2027 auction?`,
        a: s.released.length
            ? `${team.name} released ${s.released.length} player${s.released.length === 1 ? '' : 's'}: ${names(byPriceDesc(s.released))}. They go into the IPL 2027 auction pool.`
            : started
                ? `${team.name} have not released any players so far.`
                : `Releases will be confirmed with the retention list on ${RETENTION_DATE}.`,
    });

    out.push({
        q: `How much purse does ${short} have for the IPL 2027 auction?`,
        a:
            purse != null
                ? `${team.name} have ${fmt(purse)} left for the IPL 2027 auction on ${AUCTION_DATE}.` +
                (s.retained.length ? ` They spent ${fmt(s.retainedSpend)} on ${s.retained.length} retentions.` : '')
                : `${team.name}'s auction purse will be confirmed after the retentions.` +
                (s.retained.length ? ` They have committed ${fmt(s.retainedSpend)} to ${s.retained.length} retained players.` : ''),
    });

    out.push({
        q: `Where can I watch the ${short} retention announcement live?`,
        a: `The IPL 2027 retentions, including ${team.name}'s list, are streamed live on ${STREAM}. The retention deadline is ${RETENTION_DATE}, and ${short}'s retained and released players show up on this page as soon as they are announced.`,
    });

    const captain = players.find((p) => p.is_captain);
    if (captain) {
        out.push({
            q: `Who is the ${short} captain and coach for IPL 2027?`,
            a: `${captain.player_name} captains ${team.name}${captain.status === 'released' ? ' (released in the 2027 retentions)' : ''}, and the head coach is ${team.coach}.`,
        });
    }
    return out;
}

/** "Hardik Pandya (MI → PBKS, ₹18 crore)" for every player in every trade, oldest first. */
export function tradeSummary(trades: Trade[]): string {
    return [...trades]
        .sort(byTradeSeq)
        .reverse()
        .map((t, i) => `${i + 1}. ${t.team_a}–${t.team_b}: ${t.legs.map((l) => `${l.player_name} (${l.from_team} → ${l.to_team}, ${fmt(l.price)})`).join(', ')}`)
        .join('; ');
}

export function overallFaq(players: SquadPlayer[], purses: Record<string, number | null>, trades: Trade[] = []): QA[] {
    const s = summarize(players);
    const announced = TEAMS.filter((t) => summarize(players.filter((p) => p.team_code === t.code)).announced);
    const top = byPriceDesc(s.retained)[0];
    const topReleased = byPriceDesc(s.released).slice(0, 5);
    const out: QA[] = [
        {
            q: 'When are the IPL 2027 retentions announced?',
            a: `IPL 2027 retention and release lists are announced on ${RETENTION_DATE}. ${announced.length} of 10 teams have announced so far.`,
        },
        {
            q: 'Where can I watch the IPL 2027 retentions live?',
            a: `The IPL 2027 retention announcements are streamed live on ${STREAM}. The retention deadline is ${RETENTION_DATE}. Every retained and released player also appears on this page as soon as it is announced.`,
        },
        {
            q: 'When is the IPL 2027 auction?',
            a: `The IPL 2027 auction is on ${AUCTION_DATE}. Released players enter the auction pool.`,
        },
        {
            q: 'How many players were retained and released for IPL 2027?',
            a:
                s.retained.length + s.released.length > 0
                    ? `So far ${s.retained.length} players have been retained and ${s.released.length} released across the 10 IPL teams, with ${fmt(s.retainedSpend)} committed to retentions.` +
                    (s.pending.length ? ` ${s.pending.length} decisions are still awaited.` : '')
                    : `Retentions are announced on ${RETENTION_DATE}. All 10 teams currently have ${s.total} players combined.`,
        },
    ];
    if (trades.length) {
        out.push({
            q: 'Which trades happened before the IPL 2027 auction?',
            a: `${trades.length} trade${trades.length === 1 ? '' : 's'} so far, with new prices: ${tradeSummary(trades)}.`,
        });
    }
    if (top) {
        out.push({
            q: 'Who is the most expensive retained player for IPL 2027?',
            a: `${top.player_name} (${getTeam(top.team_code)?.name ?? top.team_code}) at ${fmt(top.price)} is the most expensive retention so far.`,
        });
    }
    if (topReleased.length) {
        out.push({
            q: 'Which big names were released before the IPL 2027 auction?',
            a: `The biggest releases so far: ${topReleased.map((p) => `${p.player_name} (${p.team_code}, ${fmt(p.price)})`).join(', ')}.`,
        });
    }
    const pursesKnown = TEAMS.filter((t) => purses[t.code] != null);
    if (pursesKnown.length) {
        const sorted = [...pursesKnown].sort((a, b) => (purses[b.code] ?? 0) - (purses[a.code] ?? 0));
        out.push({
            q: 'Which team has the biggest purse for the IPL 2027 auction?',
            a: `Purses for the IPL 2027 auction: ${sorted.map((t) => `${t.code} ${fmt(purses[t.code]!)}`).join(', ')}.`,
        });
    }
    return out;
}

export function faqJsonLd(qas: QA[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: qas.map((x) => ({
            '@type': 'Question',
            name: x.q,
            acceptedAnswer: { '@type': 'Answer', text: x.a },
        })),
    };
}
